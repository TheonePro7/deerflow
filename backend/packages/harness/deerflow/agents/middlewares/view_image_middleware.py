"""Middleware for injecting image details into conversation before LLM call.

This middleware adapts its behavior based on the current model's capabilities:
- If the model supports vision (supports_vision=True in config): injects full image
  data (base64 image_url blocks) so the LLM can "see" the images.
- If the model does NOT support vision (e.g. DeepSeek V4 Flash): only injects text
  descriptions of the images, and strips any legacy image_url blocks from messages
  to prevent 400 errors from the LLM provider.
"""

import logging
from typing import override

from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langgraph.runtime import Runtime

from deerflow.agents.thread_state import ThreadState
from deerflow.config import get_app_config

logger = logging.getLogger(__name__)


class ViewImageMiddlewareState(ThreadState):
    """Reuse the thread state so reducer-backed keys keep their annotations."""


class ViewImageMiddleware(AgentMiddleware[ViewImageMiddlewareState]):
    """Injects image details as a human message before LLM calls when view_image tools have completed.

    This middleware:
    1. Runs before each LLM call
    2. Checks if the last assistant message contains view_image tool calls
    3. Verifies all tool calls in that message have been completed (have corresponding ToolMessages)
    4. If conditions are met, creates a human message with all viewed image details (including base64 data)
    5. Adds the message to state so the LLM can see and analyze the images

    This enables the LLM to automatically receive and analyze images that were loaded via view_image tool,
    without requiring explicit user prompts to describe the images.
    """

    state_schema = ViewImageMiddlewareState

    def _get_last_assistant_message(self, messages: list) -> AIMessage | None:
        """Get the last assistant message from the message list.

        Args:
            messages: List of messages

        Returns:
            Last AIMessage or None if not found
        """
        for msg in reversed(messages):
            if isinstance(msg, AIMessage):
                return msg
        return None

    def _has_view_image_tool(self, message: AIMessage) -> bool:
        """Check if the assistant message contains view_image tool calls.

        Args:
            message: Assistant message to check

        Returns:
            True if message contains view_image tool calls
        """
        if not hasattr(message, "tool_calls") or not message.tool_calls:
            return False

        return any(tool_call.get("name") == "view_image" for tool_call in message.tool_calls)

    def _all_tools_completed(self, messages: list, assistant_msg: AIMessage) -> bool:
        """Check if all tool calls in the assistant message have been completed.

        Args:
            messages: List of all messages
            assistant_msg: The assistant message containing tool calls

        Returns:
            True if all tool calls have corresponding ToolMessages
        """
        if not hasattr(assistant_msg, "tool_calls") or not assistant_msg.tool_calls:
            return False

        # Get all tool call IDs from the assistant message
        tool_call_ids = {tool_call.get("id") for tool_call in assistant_msg.tool_calls if tool_call.get("id")}

        # Find the index of the assistant message
        try:
            assistant_idx = messages.index(assistant_msg)
        except ValueError:
            return False

        # Get all ToolMessages after the assistant message
        completed_tool_ids = set()
        for msg in messages[assistant_idx + 1 :]:
            if isinstance(msg, ToolMessage) and msg.tool_call_id:
                completed_tool_ids.add(msg.tool_call_id)

        # Check if all tool calls have been completed
        return tool_call_ids.issubset(completed_tool_ids)

    def _model_supports_vision(self, runtime: Runtime) -> bool:
        """Check whether the current model supports vision/image inputs.

        Looks up the model by name from ``runtime.context`` against the
        AppConfig model list. Falls back to ``False`` when the model name
        is unknown so that unsupported models are handled conservatively.

        Args:
            runtime: Runtime context containing the current model name.

        Returns:
            True if the model supports vision, False otherwise.
        """
        model_name = (runtime.context or {}).get("model_name") if runtime else None
        if not model_name:
            return False

        try:
            config = get_app_config()
            if not config:
                return False
            for m in config.models:
                if m.name == model_name:
                    return getattr(m, "supports_vision", False)
        except Exception:
            logger.debug("Could not check model vision support", exc_info=True)
        logger.debug("Unknown model '%s' — assuming no vision support", model_name)
        return False

    def _create_image_details_message(
        self,
        state: ViewImageMiddlewareState,
        *,
        include_images: bool = True,
    ) -> list[str | dict]:
        """Create a formatted message with all viewed image details.

        Args:
            state: Current state containing viewed_images
            include_images: If True, includes base64 image_url blocks so the LLM
                can see the actual images. If False, only text descriptions are
                included (for models that don't support vision).

        Returns:
            List of content blocks (text and optionally images) for the HumanMessage
        """
        viewed_images = state.get("viewed_images", {})
        if not viewed_images:
            # Return a properly formatted text block, not a plain string array
            return [{"type": "text", "text": "No images have been viewed."}]

        # Build the message with image information
        content_blocks: list[str | dict] = [{"type": "text", "text": "Here are the images you've viewed:"}]

        for image_path, image_data in viewed_images.items():
            mime_type = image_data.get("mime_type", "unknown")
            base64_data = image_data.get("base64", "")

            # Add text description
            content_blocks.append({"type": "text", "text": f"\n- **{image_path}** ({mime_type})"})

            # Add the actual image data so LLM can "see" it (only if supported)
            if include_images and base64_data:
                content_blocks.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{base64_data}"},
                    }
                )

        return content_blocks

    def _should_inject_image_message(self, state: ViewImageMiddlewareState) -> bool:
        """Determine if we should inject an image details message.

        Args:
            state: Current state

        Returns:
            True if we should inject the message
        """
        messages = state.get("messages", [])
        if not messages:
            return False

        # Get the last assistant message
        last_assistant_msg = self._get_last_assistant_message(messages)
        if not last_assistant_msg:
            return False

        # Check if it has view_image tool calls
        if not self._has_view_image_tool(last_assistant_msg):
            return False

        # Check if all tools have been completed
        if not self._all_tools_completed(messages, last_assistant_msg):
            return False

        # Check if we've already added an image details message
        # Look for a human message after the last assistant message that contains image details
        assistant_idx = messages.index(last_assistant_msg)
        for msg in messages[assistant_idx + 1 :]:
            if isinstance(msg, HumanMessage):
                content_str = str(msg.content)
                if "Here are the images you've viewed" in content_str or "Here are the details of the images you've viewed" in content_str:
                    # Already added, don't add again
                    return False

        return True

    def _inject_image_message(
        self,
        state: ViewImageMiddlewareState,
        *,
        supports_vision: bool = True,
    ) -> dict | None:
        """Internal helper to inject image details message.

        Args:
            state: Current state
            supports_vision: Whether the current model supports vision. When False,
                only text descriptions are injected (no image_url blocks).

        Returns:
            State update with additional human message, or None if no update needed
        """
        if not self._should_inject_image_message(state):
            return None

        # Create the image details message — include image data only if supported
        image_content = self._create_image_details_message(state, include_images=supports_vision)

        # Create a new human message with mixed content (text + optionally images)
        human_msg = HumanMessage(content=image_content)

        if supports_vision:
            logger.debug("Injecting image details message with images before LLM call")
        else:
            logger.debug("Injecting image details message with text only (model does not support vision)")

        # Return state update with the new message
        return {"messages": [human_msg]}

    @override
    def before_model(self, state: ViewImageMiddlewareState, runtime: Runtime) -> dict | None:
        """Inject image details message before LLM call if view_image tools have completed (sync version).

        Adapts behavior to the current model's capabilities:
        - If the model supports vision: injects full image data (image_url blocks).
        - If the model does NOT support vision: strips legacy image_url blocks from
          messages and only injects text descriptions (avoids LLM 400 errors).

        Args:
            state: Current state
            runtime: Runtime context (used to check model vision support)

        Returns:
            State update with additional human message, or None if no update needed
        """
        supports_vision = self._model_supports_vision(runtime)
        if not supports_vision:
            # Strip legacy image_url blocks for models that don't support vision
            # (e.g. DeepSeek V4 Flash) to prevent 400 errors from the LLM provider
            self._sanitize_image_blocks(state)
        return self._inject_image_message(state, supports_vision=supports_vision)

    def _sanitize_image_blocks(self, state: ViewImageMiddlewareState) -> None:
        """Remove image_url content blocks from messages.

        Strips image_url blocks from existing messages to handle legacy threads
        where images were stored in message content but the current model does
        not support vision (e.g. DeepSeek V4 Flash).
        """
        try:
            messages = state.get("messages", [])
            modified = False
            for msg in messages:
                content = getattr(msg, "content", None)
                if isinstance(content, list):
                    filtered = [
                        b for b in content
                        if not (isinstance(b, dict) and b.get("type") == "image_url")
                    ]
                    if len(filtered) != len(content):
                        msg.content = filtered
                        modified = True

            if modified:
                logger.info("Stripped image_url content blocks from messages (model does not support vision)")
        except Exception:
            logger.debug("image_url sanitization failed", exc_info=True)

    @override
    async def abefore_model(self, state: ViewImageMiddlewareState, runtime: Runtime) -> dict | None:
        """Inject image details message before LLM call if view_image tools have completed (async version).

        Adapts behavior to the current model's capabilities (same as before_model).

        Args:
            state: Current state
            runtime: Runtime context (used to check model vision support)

        Returns:
            State update with additional human message, or None if no update needed
        """
        supports_vision = self._model_supports_vision(runtime)
        if not supports_vision:
            self._sanitize_image_blocks(state)
        return self._inject_image_message(state, supports_vision=supports_vision)
