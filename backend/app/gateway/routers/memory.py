"""Memory API router for retrieving and managing global memory data."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from deerflow.agents.memory.updater import (
    clear_memory_data,
    create_memory_fact,
    delete_memory_fact,
    get_memory_data,
    import_memory_data,
    reload_memory_data,
    update_memory_fact,
)
from deerflow.config.memory_config import get_memory_config
from deerflow.runtime.user_context import get_effective_user_id

router = APIRouter(prefix="/api", tags=["memory"])


class ContextSection(BaseModel):
    """Model for context sections (user and history)."""

    summary: str = Field(default="", description="Summary content")
    updatedAt: str = Field(default="", description="Last update timestamp")


class UserContext(BaseModel):
    """Model for user context."""

    workContext: ContextSection = Field(default_factory=ContextSection)
    personalContext: ContextSection = Field(default_factory=ContextSection)
    topOfMind: ContextSection = Field(default_factory=ContextSection)


class HistoryContext(BaseModel):
    """Model for history context."""

    recentMonths: ContextSection = Field(default_factory=ContextSection)
    earlierContext: ContextSection = Field(default_factory=ContextSection)
    longTermBackground: ContextSection = Field(default_factory=ContextSection)


class Fact(BaseModel):
    """Model for a memory fact."""

    id: str = Field(..., description="Unique identifier for the fact")
    content: str = Field(..., description="Fact content")
    category: str = Field(default="context", description="Fact category")
    confidence: float = Field(default=0.5, description="Confidence score (0-1)")
    createdAt: str = Field(default="", description="Creation timestamp")
    source: str = Field(default="unknown", description="Source thread ID")
    sourceError: str | None = Field(default=None, description="Optional description of the prior mistake or wrong approach")


class MemoryResponse(BaseModel):
    """Response model for memory data."""

    version: str = Field(default="1.0", description="Memory schema version")
    lastUpdated: str = Field(default="", description="Last update timestamp")
    user: UserContext = Field(default_factory=UserContext)
    history: HistoryContext = Field(default_factory=HistoryContext)
    facts: list[Fact] = Field(default_factory=list)


def _map_memory_fact_value_error(exc: ValueError) -> HTTPException:
    """Convert updater validation errors into stable API responses."""
    if exc.args and exc.args[0] == "confidence":
        detail = "Invalid confidence value; must be between 0 and 1."
    else:
        detail = "Memory fact content cannot be empty."
    return HTTPException(status_code=400, detail=detail)


class FactCreateRequest(BaseModel):
    """Request model for creating a memory fact."""

    content: str = Field(..., min_length=1, description="Fact content")
    category: str = Field(default="context", description="Fact category")
    confidence: float = Field(default=0.5, ge=0.0, le=1.0, description="Confidence score (0-1)")


class FactPatchRequest(BaseModel):
    """PATCH request model that preserves existing values for omitted fields."""

    content: str | None = Field(default=None, min_length=1, description="Fact content")
    category: str | None = Field(default=None, description="Fact category")
    confidence: float | None = Field(default=None, ge=0.0, le=1.0, description="Confidence score (0-1)")


class MemoryConfigResponse(BaseModel):
    """Response model for memory configuration."""

    enabled: bool = Field(..., description="Whether memory is enabled")
    storage_path: str = Field(..., description="Path to memory storage file")
    debounce_seconds: int = Field(..., description="Debounce time for memory updates")
    max_facts: int = Field(..., description="Maximum number of facts to store")
    fact_confidence_threshold: float = Field(..., description="Minimum confidence threshold for facts")
    injection_enabled: bool = Field(..., description="Whether memory injection is enabled")
    max_injection_tokens: int = Field(..., description="Maximum tokens for memory injection")


class MemoryStatusResponse(BaseModel):
    """Response model for memory status."""

    config: MemoryConfigResponse
    data: MemoryResponse


@router.get(
    "/memory",
    response_model=MemoryResponse,
    response_model_exclude_none=True,
    summary="Get Memory Data",
    description="Retrieve the current global memory data including user context, history, and facts.",
)
async def get_memory() -> MemoryResponse:
    """Get the current global memory data.

    Returns:
        The current memory data with user context, history, and facts.

    Example Response:
        ```json
        {
            "version": "1.0",
            "lastUpdated": "2024-01-15T10:30:00Z",
            "user": {
                "workContext": {"summary": "Working on DeerFlow project", "updatedAt": "..."},
                "personalContext": {"summary": "Prefers concise responses", "updatedAt": "..."},
                "topOfMind": {"summary": "Building memory API", "updatedAt": "..."}
            },
            "history": {
                "recentMonths": {"summary": "Recent development activities", "updatedAt": "..."},
                "earlierContext": {"summary": "", "updatedAt": ""},
                "longTermBackground": {"summary": "", "updatedAt": ""}
            },
            "facts": [
                {
                    "id": "fact_abc123",
                    "content": "User prefers TypeScript over JavaScript",
                    "category": "preference",
                    "confidence": 0.9,
                    "createdAt": "2024-01-15T10:30:00Z",
                    "source": "thread_xyz"
                }
            ]
        }
        ```
    """
    memory_data = get_memory_data(user_id=get_effective_user_id())
    return MemoryResponse(**memory_data)


@router.post(
    "/memory/reload",
    response_model=MemoryResponse,
    response_model_exclude_none=True,
    summary="Reload Memory Data",
    description="Reload memory data from the storage file, refreshing the in-memory cache.",
)
async def reload_memory() -> MemoryResponse:
    """Reload memory data from file.

    This forces a reload of the memory data from the storage file,
    useful when the file has been modified externally.

    Returns:
        The reloaded memory data.
    """
    memory_data = reload_memory_data(user_id=get_effective_user_id())
    return MemoryResponse(**memory_data)


@router.delete(
    "/memory",
    response_model=MemoryResponse,
    response_model_exclude_none=True,
    summary="Clear All Memory Data",
    description="Delete all saved memory data and reset the memory structure to an empty state.",
)
async def clear_memory() -> MemoryResponse:
    """Clear all persisted memory data."""
    try:
        memory_data = clear_memory_data(user_id=get_effective_user_id())
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to clear memory data.") from exc

    return MemoryResponse(**memory_data)


@router.post(
    "/memory/facts",
    response_model=MemoryResponse,
    response_model_exclude_none=True,
    summary="Create Memory Fact",
    description="Create a single saved memory fact manually.",
)
async def create_memory_fact_endpoint(request: FactCreateRequest) -> MemoryResponse:
    """Create a single fact manually."""
    try:
        memory_data = create_memory_fact(
            content=request.content,
            category=request.category,
            confidence=request.confidence,
            user_id=get_effective_user_id(),
        )
    except ValueError as exc:
        raise _map_memory_fact_value_error(exc) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to create memory fact.") from exc

    return MemoryResponse(**memory_data)


@router.delete(
    "/memory/facts/{fact_id}",
    response_model=MemoryResponse,
    response_model_exclude_none=True,
    summary="Delete Memory Fact",
    description="Delete a single saved memory fact by its fact id.",
)
async def delete_memory_fact_endpoint(fact_id: str) -> MemoryResponse:
    """Delete a single fact from memory by fact id."""
    try:
        memory_data = delete_memory_fact(fact_id, user_id=get_effective_user_id())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Memory fact '{fact_id}' not found.") from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to delete memory fact.") from exc

    return MemoryResponse(**memory_data)


@router.patch(
    "/memory/facts/{fact_id}",
    response_model=MemoryResponse,
    response_model_exclude_none=True,
    summary="Patch Memory Fact",
    description="Partially update a single saved memory fact by its fact id while preserving omitted fields.",
)
async def update_memory_fact_endpoint(fact_id: str, request: FactPatchRequest) -> MemoryResponse:
    """Partially update a single fact manually."""
    try:
        memory_data = update_memory_fact(
            fact_id=fact_id,
            content=request.content,
            category=request.category,
            confidence=request.confidence,
            user_id=get_effective_user_id(),
        )
    except ValueError as exc:
        raise _map_memory_fact_value_error(exc) from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Memory fact '{fact_id}' not found.") from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to update memory fact.") from exc

    return MemoryResponse(**memory_data)


@router.get(
    "/memory/export",
    response_model=MemoryResponse,
    response_model_exclude_none=True,
    summary="Export Memory Data",
    description="Export the current global memory data as JSON for backup or transfer.",
)
async def export_memory() -> MemoryResponse:
    """Export the current memory data."""
    memory_data = get_memory_data(user_id=get_effective_user_id())
    return MemoryResponse(**memory_data)


@router.post(
    "/memory/import",
    response_model=MemoryResponse,
    response_model_exclude_none=True,
    summary="Import Memory Data",
    description="Import and overwrite the current global memory data from a JSON payload.",
)
async def import_memory(request: MemoryResponse) -> MemoryResponse:
    """Import and persist memory data."""
    try:
        memory_data = import_memory_data(request.model_dump(), user_id=get_effective_user_id())
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to import memory data.") from exc

    return MemoryResponse(**memory_data)


@router.get(
    "/memory/config",
    response_model=MemoryConfigResponse,
    summary="Get Memory Configuration",
    description="Retrieve the current memory system configuration.",
)
async def get_memory_config_endpoint() -> MemoryConfigResponse:
    """Get the memory system configuration.

    Returns:
        The current memory configuration settings.

    Example Response:
        ```json
        {
            "enabled": true,
            "storage_path": ".deer-flow/memory.json",
            "debounce_seconds": 30,
            "max_facts": 100,
            "fact_confidence_threshold": 0.7,
            "injection_enabled": true,
            "max_injection_tokens": 2000
        }
        ```
    """
    config = get_memory_config()
    return MemoryConfigResponse(
        enabled=config.enabled,
        storage_path=config.storage_path,
        debounce_seconds=config.debounce_seconds,
        max_facts=config.max_facts,
        fact_confidence_threshold=config.fact_confidence_threshold,
        injection_enabled=config.injection_enabled,
        max_injection_tokens=config.max_injection_tokens,
    )


@router.get(
    "/memory/status",
    response_model=MemoryStatusResponse,
    response_model_exclude_none=True,
    summary="Get Memory Status",
    description="Retrieve both memory configuration and current data in a single request.",
)
async def get_memory_status() -> MemoryStatusResponse:
    """Get the memory system status including configuration and data.

    Returns:
        Combined memory configuration and current data.
    """
    config = get_memory_config()
    memory_data = get_memory_data(user_id=get_effective_user_id())

    return MemoryStatusResponse(
        config=MemoryConfigResponse(
            enabled=config.enabled,
            storage_path=config.storage_path,
            debounce_seconds=config.debounce_seconds,
            max_facts=config.max_facts,
            fact_confidence_threshold=config.fact_confidence_threshold,
            injection_enabled=config.injection_enabled,
            max_injection_tokens=config.max_injection_tokens,
        ),
        data=MemoryResponse(**memory_data),
    )


# ══════════════════════════════════════════════════════════════════════════════
# LangMem Memory CRUD
# ══════════════════════════════════════════════════════════════════════════════

class LangMemItem(BaseModel):
    """A single LangMem memory item."""
    id: str = Field(default="", description="Item key in the store")
    content: str = Field(default="", description="Memory content text")
    type: str = Field(default="general", description="Memory type")
    updated_at: str = Field(default="", description="Last update timestamp")


class LangMemListResponse(BaseModel):
    """List of LangMem memories."""
    memories: list[LangMemItem] = Field(default_factory=list)
    total: int = Field(default=0)


class LangMemCreateRequest(BaseModel):
    """Request to create a new LangMem memory."""
    content: str = Field(..., min_length=1, description="Memory content")
    type: str = Field(default="general", description="Memory type")


class LangMemUpdateRequest(BaseModel):
    """Request to update an existing LangMem memory."""
    content: str = Field(..., min_length=1, description="Memory content")
    type: str = Field(default="general", description="Memory type")


@router.get(
    "/langmem",
    response_model=LangMemListResponse,
    summary="List LangMem Memories",
    description="List LangMem memories for the current user, with pagination.",
)
async def list_langmem(
    offset: int = 0,
    limit: int = 100,
) -> LangMemListResponse:
    """List LangMem memories with pagination."""
    user_id = get_effective_user_id()
    limit = min(limit, 500)  # cap at 500 per page
    memories = await _fetch_langmem_memories(user_id, offset=offset, limit=limit)
    return LangMemListResponse(memories=memories, total=len(memories))


@router.post(
    "/langmem",
    response_model=LangMemListResponse,
    summary="Create LangMem Memory",
    description="Manually create a new LangMem memory.",
)
async def create_langmem(request: LangMemCreateRequest) -> LangMemListResponse:
    """Create a new LangMem memory manually."""
    user_id = get_effective_user_id()
    import uuid
    key = f"manual_{uuid.uuid4().hex[:8]}"
    await _put_langmem_memory(user_id, key, request.content, request.type)
    memories = await _fetch_langmem_memories(user_id)
    return LangMemListResponse(memories=memories, total=len(memories))


@router.put(
    "/langmem/{memory_id}",
    response_model=LangMemListResponse,
    summary="Update LangMem Memory",
    description="Update an existing LangMem memory.",
)
async def update_langmem(memory_id: str, request: LangMemUpdateRequest) -> LangMemListResponse:
    """Update an existing LangMem memory."""
    user_id = get_effective_user_id()
    await _put_langmem_memory(user_id, memory_id, request.content, request.type)
    memories = await _fetch_langmem_memories(user_id)
    return LangMemListResponse(memories=memories, total=len(memories))


@router.delete(
    "/langmem/{memory_id}",
    response_model=LangMemListResponse,
    summary="Delete LangMem Memory",
    description="Delete a LangMem memory by its ID.",
)
async def delete_langmem(memory_id: str) -> LangMemListResponse:
    """Delete a LangMem memory."""
    user_id = get_effective_user_id()
    try:
        from langgraph.store.sqlite.aio import AsyncSqliteStore
        from deerflow.config.paths import get_paths
        db_path = f"{get_paths().base_dir}/langmem.db"
        async with AsyncSqliteStore.from_conn_string(db_path) as store:
            await store.adelete(
                ("memories", user_id, "semantic"),
                memory_id,
            )
    except Exception:
        pass
    memories = await _fetch_langmem_memories(user_id)
    return LangMemListResponse(memories=memories, total=len(memories))


# ── helpers ────────────────────────────────────────────────────────────────

async def _fetch_langmem_memories(user_id: str, offset: int = 0, limit: int = 100) -> list[LangMemItem]:
    """Fetch LangMem memories with pagination."""
    try:
        from deerflow.agents.memory.langmem_adapter import is_available
        if not is_available():
            return []
        from langgraph.store.sqlite.aio import AsyncSqliteStore
        from deerflow.config.paths import get_paths
        db_path = f"{get_paths().base_dir}/langmem.db"
        async with AsyncSqliteStore.from_conn_string(db_path) as store:
            results = await store.asearch(
                ("memories", user_id, "semantic"),
                query=None,
                limit=limit,
                offset=offset,
            )
            items = []
            for r in results:
                val = r.value if hasattr(r, "value") else {}
                content = ""
                if isinstance(val, dict):
                    content = val.get("content", "") or ""
                items.append(LangMemItem(
                    id=r.key,
                    content=str(content),
                    type=(val.get("type", "general") if isinstance(val, dict) else "general"),
                    updated_at=(val.get("updated_at", "") if isinstance(val, dict) else ""),
                ))
            return items
    except Exception:
        return []


async def _put_langmem_memory(user_id: str, key: str, content: str, mem_type: str = "general"):
    """Store a LangMem memory."""
    try:
        from langgraph.store.sqlite.aio import AsyncSqliteStore
        from deerflow.config.paths import get_paths
        from datetime import datetime, timezone
        db_path = f"{get_paths().base_dir}/langmem.db"
        async with AsyncSqliteStore.from_conn_string(db_path) as store:
            await store.aput(
                ("memories", user_id, "semantic"),
                key,
                {
                    "content": content,
                    "type": mem_type,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
            )
    except Exception:
        pass
