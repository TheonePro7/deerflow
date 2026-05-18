"""Knowledge base — shared directory listing."""

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def get_knowledge_base_config() -> Optional[dict]:
    """Read knowledge_base config from the app config."""
    try:
        from deerflow.config.app_config import get_app_config
        cfg = get_app_config()
        if hasattr(cfg, 'knowledge_base') and cfg.knowledge_base and cfg.knowledge_base.get('enabled'):
            return cfg.knowledge_base
    except Exception as e:
        logger.debug("knowledge_base not configured: %s", e)
    return None


def list_shared_files(base_path: str) -> list[str]:
    """Recursively list all files in the shared directory."""
    path = Path(base_path)
    if not path.exists():
        return []

    files = []
    for f in sorted(path.rglob("*")):
        if f.is_file():
            # Return paths relative to the knowledge base root
            rel = f.relative_to(path)
            files.append(rel.as_posix())
    return files
