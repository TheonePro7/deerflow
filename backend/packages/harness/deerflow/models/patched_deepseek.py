"""Patched ChatDeepSeek that preserves reasoning_content in multi-turn conversations.

This module provides a patched version of ChatDeepSeek that properly handles
reasoning_content when sending messages back to the API. The original implementation
stores reasoning_content in additional_kwargs but doesn't include it when making
subsequent API calls, which causes errors with APIs that require reasoning_content
on all assistant messages when thinking mode is enabled.
"""

import logging
from typing import Any

from langchain_core.language_models import LanguageModelInput
from langchain_core.messages import AIMessage
from langchain_deepseek import ChatDeepSeek

logger = logging.getLogger(__name__)


class PatchedChatDeepSeek(ChatDeepSeek):
    """ChatDeepSeek with proper reasoning_content preservation.

    When using thinking/reasoning enabled models, the API expects reasoning_content
    to be present on ALL assistant messages in multi-turn conversations. This patched
    version ensures reasoning_content from additional_kwargs is included in the
    request payload.
    """

    @classmethod
    def is_lc_serializable(cls) -> bool:
        return True

    @property
    def lc_secrets(self) -> dict[str, str]:
        return {"api_key": "DEEPSEEK_API_KEY", "openai_api_key": "DEEPSEEK_API_KEY"}

    @staticmethod
    def _strip_image_url_from_content(content: Any) -> Any:
        """Remove ``image_url`` content blocks from message content.

        DeepSeek models do NOT support ``image_url`` content blocks. If such blocks
        reach the API they cause a ``400`` error. This method strips them from
        both list-based and string-based message content, regardless of source
        (middleware injection, legacy threads, readability, etc.).

        Args:
            content: Raw message content (string or list of content blocks).

        Returns:
            Cleaned content with all ``image_url`` blocks removed.
        """
        if isinstance(content, list):
            filtered = [
                b for b in content
                if not (isinstance(b, dict) and b.get("type") == "image_url")
            ]
            if len(filtered) != len(content):
                logger.info(
                    "Stripped %d image_url block(s) from DeepSeek payload",
                    len(content) - len(filtered),
                )
            return filtered
        return content

    def _get_request_payload(
        self,
        input_: LanguageModelInput,
        *,
        stop: list[str] | None = None,
        **kwargs: Any,
    ) -> dict:
        """Get request payload with reasoning_content preserved.

        Overrides the parent method to inject reasoning_content from
        additional_kwargs into assistant messages in the payload.
        """
        # Get the original messages before conversion
        original_messages = self._convert_input(input_).to_messages()

        # Call parent to get the base payload
        payload = super()._get_request_payload(input_, stop=stop, **kwargs)

        # Match payload messages with original messages to restore reasoning_content
        payload_messages = payload.get("messages", [])

        # The payload messages and original messages should be in the same order
        # Iterate through both and match by position
        if len(payload_messages) == len(original_messages):
            for payload_msg, orig_msg in zip(payload_messages, original_messages):
                if payload_msg.get("role") == "assistant" and isinstance(orig_msg, AIMessage):
                    reasoning_content = orig_msg.additional_kwargs.get("reasoning_content")
                    if reasoning_content is not None:
                        payload_msg["reasoning_content"] = reasoning_content
        else:
            # Fallback: match by counting assistant messages
            ai_messages = [m for m in original_messages if isinstance(m, AIMessage)]
            assistant_payloads = [(i, m) for i, m in enumerate(payload_messages) if m.get("role") == "assistant"]

            for (idx, payload_msg), ai_msg in zip(assistant_payloads, ai_messages):
                reasoning_content = ai_msg.additional_kwargs.get("reasoning_content")
                if reasoning_content is not None:
                    payload_messages[idx]["reasoning_content"] = reasoning_content

        # Strip image_url blocks from ALL messages before sending to DeepSeek API.
        # DeepSeek models do NOT support image_url; if any reach the API they
        # return a 400 error. This is the last line of defense regardless of
        # where the image_url blocks came from (middleware, readability, etc.).
        for msg in payload_messages:
            if "content" in msg:
                msg["content"] = self._strip_image_url_from_content(msg["content"])

        return payload
