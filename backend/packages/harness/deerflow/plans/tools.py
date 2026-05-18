"""Agent tools for plan management — called by the LLM during conversations."""

from datetime import datetime, timezone
from uuid import uuid4

from langchain_core.tools import tool


@tool
def create_plan(
    title: str,
    description: str = "",
    due_date: str = "",
    priority: str = "medium",
) -> str:
    """Create a new plan/task. The agent uses this when the user says things like
    'remind me to...', 'schedule a task for...', 'create a plan to...', 'set a reminder...'.

    Args:
        title: Short title of the plan/task.
        description: Detailed description of what needs to be done.
        due_date: Due date in ISO format (YYYY-MM-DD) or natural language date.
        priority: Priority level: 'low', 'medium', or 'high'.

    Returns:
        Confirmation message with the created plan ID.
    """
    from deerflow.plans.store import add_plan

    plan = {
        "id": str(uuid4()),
        "title": title,
        "description": description,
        "dueDate": due_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "priority": priority if priority in ("low", "medium", "high") else "medium",
        "status": "pending",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    add_plan(plan)
    return f"✅ 计划已创建: {title} (ID: {plan['id']}, 截止: {plan['dueDate']})"


@tool
def list_plans(status: str = "") -> str:
    """List all plans, optionally filtered by status.

    Args:
        status: Filter by status: 'pending', 'completed', or empty for all.

    Returns:
        Formatted list of plans.
    """
    from deerflow.plans.store import list_plans as _list

    plans = _list()
    if status:
        plans = [p for p in plans if p.get("status") == status]

    if not plans:
        return "暂无计划。"

    lines = ["📋 计划列表:"]
    for p in plans:
        mark = "✅" if p.get("status") == "completed" else "⬜"
        pri = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(p.get("priority", "medium"), "⚪")
        lines.append(f"  {mark} {pri} {p['title']} (截止: {p.get('dueDate', '未设置')})")
    return "\n".join(lines)


@tool
def complete_plan(plan_id: str) -> str:
    """Mark a plan as completed.

    Args:
        plan_id: The ID of the plan to complete.

    Returns:
        Confirmation message.
    """
    from deerflow.plans.store import update_plan

    p = update_plan(plan_id, {"status": "completed"})
    if p:
        return f"✅ 计划已完成: {p['title']}"
    return "❌ 未找到该计划"


@tool
def delete_plan(plan_id: str) -> str:
    """Delete a plan.

    Args:
        plan_id: The ID of the plan to delete.

    Returns:
        Confirmation message.
    """
    from deerflow.plans.store import delete_plan as _delete

    if _delete(plan_id):
        return "✅ 计划已删除"
    return "❌ 未找到该计划"


TOOLS = [create_plan, list_plans, complete_plan, delete_plan]
