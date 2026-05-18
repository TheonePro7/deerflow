"""REST API for plan/task management — read by the frontend calendar view."""

import logging

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["plans"])


@router.get("/plans", summary="List all plans")
async def get_plans():
    """Return all plans from the memory store for the calendar view."""
    from deerflow.plans.store import list_plans
    return {"plans": list_plans()}
