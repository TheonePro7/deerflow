"""LangMem integration adapter for DeerFlow.

Runs alongside the existing memory system — does NOT replace it.
Extracts structured memories using LangMem and stores them in
DeerFlow's existing BaseStore (SQLite).
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from langchain_core.messages import AnyMessage
from langgraph.store.base import BaseStore

logger = logging.getLogger(__name__)

__all__ = [
    "LangMemManager",
    "is_available",
]

# Lazy import — LangMem is an optional dependency
_langmem_available: bool | None = None


def is_available() -> bool:
    """Check if LangMem is installed."""
    global _langmem_available
    if _langmem_available is None:
        try:
            import langmem  # noqa: F401
            _langmem_available = True
        except ImportError:
            _langmem_available = False
    return _langmem_available


# ---------------------------------------------------------------------------
# LangMem Manager
# ---------------------------------------------------------------------------

class LangMemManager:
    """Manages LangMem memory extraction and injection for DeerFlow.

    Usage:
        manager = LangMemManager(store=app.state.store, model_name="deepseek-v4-flash")
        memories = await manager.extract(messages)
        context = await manager.search(query="user preferences")
    """

    def __init__(
        self,
        store: BaseStore,
        model_name: str = "deepseek-v4-flash",
        *,
        user_id: str = "default",
        namespace: tuple[str, ...] = ("memories",),
        enabled: bool = True,
    ):
        self._store = store
        self._model_name = model_name
        self._user_id = user_id
        self._namespace = namespace
        self._enabled = enabled and is_available()
        self._manager = None  # lazy init

    async def _ensure_initialized(self):
        """Lazy init to avoid import overhead at startup."""
        if self._manager is not None or not self._enabled:
            return
        try:
            from langmem import create_memory_manager

            self._manager = create_memory_manager(
                self._model_name,
                instructions="""从对话中提取关键信息，包括：
1. 用户偏好（语言、风格、习惯）
2. 工作领域和背景
3. 技术决策和理由
4. 项目需求和目标
对每条信息标记类型。如果对话太短或没有实质性信息，返回空列表。

⚠️ 重要：所有输出必须使用中文（简体），不要使用英文。用户使用中文交流，记忆也必须用中文存储。""",
            )
            logger.info(
                "LangMemManager initialized (model=%s, namespace=%s)",
                self._model_name,
                self._namespace,
            )
        except Exception as exc:
            logger.warning("LangMem init failed: %s", exc)
            self._enabled = False

    async def extract(
        self,
        messages: list[AnyMessage],
    ) -> list[dict[str, Any]]:
        """Extract memories from a conversation and persist them to the store.

        Args:
            messages: List of conversation messages.

        Returns:
            List of extracted memory dicts with 'content' and 'type'.
        """
        if not self._enabled:
            return []
        await self._ensure_initialized()
        if not self._manager:
            return []

        try:
            import asyncio

            result = await asyncio.to_thread(
                self._manager.invoke,
                {"messages": messages, "max_steps": 1, "existing": []},
            )
            extracted = []
            if isinstance(result, list):
                for item in result:
                    if hasattr(item, "content") and hasattr(item.content, "content"):
                        content = item.content.content
                        text = str(content) if content else ""
                        if text:
                            text_lower = text.lower()
                            # Classify by keyword matching across full text.
                            # LangMem model output format is NOT stable — may use brackets
                            # ([决策 | 0.9]), full-width brackets (【决策】), prefix (决策：),
                            # or just plain text. Keyword matching handles all variations.
                            # Keywords are ordered by specificity (longer first) to avoid
                            # short keywords like "偏好" matching "技术偏好".
                            type_keywords = [
                                (["用户偏好", "用户习惯", "用户喜欢", "用户要求", "preference", "习惯使用"], "用户偏好"),
                                (["工作领域", "项目背景", "工作背景", "工作行业", "开发", "work"], "工作领域"),
                                (["技术决策", "技术选型", "技术方案", "技术决定", "技术偏好", "技术方向"], "技术决策"),
                                (["项目需求", "用户需求", "需求分析", "requirement"], "项目需求"),
                                (["项目目标", "项目状态", "项目进度", "项目背景", "项目", "目标", "milestone", "goal"], "项目目标"),
                            ]
                            mem_type = "general"
                            for keywords, type_name in type_keywords:
                                for kw in keywords:
                                    if kw.lower() in text_lower:
                                        mem_type = type_name
                                        break
                                if mem_type != "general":
                                    break
                            # Fallback: single-keyword matching for common terms
                            if mem_type == "general":
                                if "偏好" in text_lower or "中文" in text_lower or "喜欢" in text_lower:
                                    mem_type = "用户偏好"
                                elif "决策" in text_lower or "选型" in text_lower or "架构" in text_lower:
                                    mem_type = "技术决策"
                                elif "领域" in text_lower or "行业" in text_lower or "开发" in text_lower:
                                    mem_type = "工作领域"

                            mem_id = getattr(item, "id", None) or str(uuid.uuid4())
                            extracted.append({
                                "type": mem_type,
                                "content": text,
                                "id": mem_id,
                            })

            # ⚡ Persist extracted memories to the store (跨对话共享)
            for mem in extracted:
                namespace = self._namespace + (self._user_id, "semantic")
                key = f"{mem['type']}_{mem['id'][:8]}"
                try:
                    await self._store.aput(namespace, key, {
                        "content": mem["content"],
                        "type": mem["type"],
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    })
                except Exception as store_err:
                    logger.warning("Failed to persist LangMem memory: %s", store_err)

            if extracted:
                logger.info("LangMem extracted & saved %d memories", len(extracted))
            return extracted
        except Exception as exc:
            logger.warning("LangMem extraction failed: %s", exc)
            return []

    async def search(
        self,
        query: str,
        *,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Search for relevant memories using LangMem.

        Uses the store's built-in search (which may be semantic or
        keyword-based depending on store configuration).

        Args:
            query: Search query text.
            limit: Maximum results.

        Returns:
            List of matching memory items.
        """
        if not self._enabled or not self._store:
            return []
        try:
            results = await self._store.asearch(
                self._namespace,
                query=query,
                limit=limit,
            )
            return [
                {
                    "key": r.key,
                    "value": r.value,
                    "score": getattr(r, "score", None),
                }
                for r in results
            ]
        except Exception as exc:
            logger.warning("LangMem search failed: %s", exc)
            return []
