"""Knowledge base management API — list, upload, delete, mkdir, rename."""

import logging
import os
import shutil
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from deerflow.knowledge_base.store import get_knowledge_base_config, list_shared_files

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["knowledge_base"])


def _get_base_path() -> Path:
    kb = get_knowledge_base_config()
    if not kb or not kb.get("enabled"):
        raise HTTPException(status_code=404, detail="Knowledge base not configured")
    return Path(kb["path"])


@router.get("/knowledge-base", summary="Get knowledge base info and file list")
async def get_knowledge_base():
    """Return knowledge base configuration and file listing."""
    kb = get_knowledge_base_config()
    if not kb:
        return {
            "config": {"enabled": False, "path": "", "display_name": "知识库"},
            "files": [],
        }

    files = list_shared_files(kb["path"])
    return {
        "config": {
            "enabled": kb.get("enabled", True),
            "path": kb.get("path", ""),
            "display_name": kb.get("display_name", "知识库"),
        },
        "files": files,
    }


@router.post("/knowledge-base/upload", summary="Upload files to knowledge base")
async def upload_knowledge_files(files: list[UploadFile] = File(...), target_dir: str = ""):
    """Upload one or more files to the knowledge base."""
    base = _get_base_path()
    target = base / target_dir if target_dir else base
    target.mkdir(parents=True, exist_ok=True)

    uploaded = []
    errors = []
    for f in files:
        if not f.filename:
            continue
        safe_name = os.path.basename(f.filename)
        dest = target / safe_name
        try:
            content = await f.read()
            dest.write_bytes(content)
            uploaded.append(safe_name)
            logger.info("Uploaded to knowledge base: %s", dest)
        except Exception as e:
            errors.append({"file": safe_name, "error": str(e)})

    return {"uploaded": uploaded, "errors": errors}


@router.get("/knowledge-base/files/content", summary="Read file content")
async def read_knowledge_file(path: str):
    """Read a file from knowledge base and return its content."""
    base = _get_base_path()
    resolved = (base / path).resolve()
    if not str(resolved).startswith(str(base.resolve())):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not resolved.exists() or not resolved.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # Detect MIME type
    import mimetypes
    mime_type, _ = mimetypes.guess_type(str(resolved))
    mime_type = mime_type or "application/octet-stream"

    # For text files, return as text
    if mime_type.startswith("text/") or mime_type in ("application/json", "application/xml"):
        content = resolved.read_text(encoding="utf-8", errors="replace")
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(content, media_type=mime_type)

    # For images, return raw bytes
    if mime_type.startswith("image/"):
        from fastapi.responses import Response
        return Response(content=resolved.read_bytes(), media_type=mime_type)

    # For PDF, return raw bytes
    if mime_type == "application/pdf":
        from fastapi.responses import Response
        return Response(content=resolved.read_bytes(), media_type=mime_type)

    # Default: return as text with warning
    content = resolved.read_text(encoding="utf-8", errors="replace")
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(content, media_type="text/plain")


@router.post("/knowledge-base/directory", summary="Create a new directory")
async def create_knowledge_directory(path: str):
    """Create a new directory in the knowledge base. Path is relative to KB root."""
    base = _get_base_path()
    resolved = (base / path).resolve()
    if not str(resolved).startswith(str(base.resolve())):
        raise HTTPException(status_code=400, detail="Invalid path")
    resolved.mkdir(parents=True, exist_ok=True)
    return {"created": path}


@router.put("/knowledge-base/files", summary="Rename or move a file/directory")
async def rename_knowledge_file(path: str, new_path: str):
    """Rename or move a file/directory. Both paths are relative to KB root."""
    base = _get_base_path()
    src = (base / path).resolve()
    dst = (base / new_path).resolve()
    if not str(src).startswith(str(base.resolve())) or not str(dst).startswith(str(base.resolve())):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not src.exists():
        raise HTTPException(status_code=404, detail="Source not found")
    dst.parent.mkdir(parents=True, exist_ok=True)
    src.rename(dst)
    return {"renamed": path, "to": new_path}


@router.delete("/knowledge-base/files", summary="Delete file from knowledge base")
async def delete_knowledge_file(path: str):
    """Delete a file from the knowledge base. Path is relative to KB root."""
    base = _get_base_path()
    # Security: prevent path traversal
    resolved = (base / path).resolve()
    if not str(resolved).startswith(str(base.resolve())):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not resolved.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if resolved.is_file():
        resolved.unlink()
    else:
        shutil.rmtree(resolved)
    return {"deleted": path}
