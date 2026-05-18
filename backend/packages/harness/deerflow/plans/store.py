"""Plan storage — persists to memory.json alongside existing memory data."""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

PLANS_KEY = "__plans__"

def _get_memory_path() -> Path:
    from deerflow.config.paths import get_paths
    return get_paths().memory_file

def _load_all() -> dict[str, Any]:
    path = _get_memory_path()
    if not path.exists():
        return {}
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning("Failed to load memory: %s", e)
        return {}

def _save_all(data: dict[str, Any]) -> None:
    path = _get_memory_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def list_plans() -> list[dict]:
    data = _load_all()
    return data.get(PLANS_KEY, [])

def add_plan(plan: dict) -> dict:
    data = _load_all()
    plans = data.setdefault(PLANS_KEY, [])
    plans.append(plan)
    _save_all(data)
    return plan

def update_plan(plan_id: str, updates: dict) -> dict | None:
    data = _load_all()
    plans = data.get(PLANS_KEY, [])
    for p in plans:
        if p["id"] == plan_id:
            p.update(updates)
            p["updatedAt"] = datetime.now(timezone.utc).isoformat()
            _save_all(data)
            return p
    return None

def delete_plan(plan_id: str) -> bool:
    data = _load_all()
    plans = data.get(PLANS_KEY, [])
    new_plans = [p for p in plans if p["id"] != plan_id]
    if len(new_plans) == len(plans):
        return False
    data[PLANS_KEY] = new_plans
    _save_all(data)
    return True
