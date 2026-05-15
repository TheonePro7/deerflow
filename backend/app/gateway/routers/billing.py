"""Billing overview endpoint — real balance from DeepSeek + usage stats from DB."""

from __future__ import annotations

import logging
import os
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.gateway.authz import require_permission
from deerflow.persistence.engine import get_session_factory

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["billing"])


class BalanceInfo(BaseModel):
    """Balance information from DeepSeek API."""

    currency: str = Field(default="CNY")
    total_balance: str = Field(default="0.00")
    topped_up_balance: str = Field(default="0.00")


class DailyUsage(BaseModel):
    """Token and cost usage for a single day."""

    date: str = Field(description="ISO date string YYYY-MM-DD")
    input_tokens: int = Field(default=0)
    output_tokens: int = Field(default=0)
    total_tokens: int = Field(default=0)
    cost: float = Field(default=0.0, description="Estimated cost in CNY/USD")


class BillingOverviewResponse(BaseModel):
    """Combined billing overview."""

    balance: BalanceInfo | None = Field(default=None, description="DeepSeek account balance")
    daily_usage: list[DailyUsage] = Field(default_factory=list, description="Daily usage for last 30 days")
    total_input_tokens: int = Field(default=0)
    total_output_tokens: int = Field(default=0)
    total_tokens: int = Field(default=0)
    total_cost: float = Field(default=0.0)


# Model pricing per 1M tokens (in USD) — used to calculate cost from actual token counts
MODEL_PRICING: dict[str, tuple[float, float]] = {
    "deepseek-v4-flash": (0.15, 0.60),
    "deepseek-v4-pro":   (0.50, 2.00),
    "deepseek-v3":       (0.27, 1.10),
}


def _calculate_cost(model_name: str | None, input_tokens: int, output_tokens: int) -> float:
    """Calculate estimated cost for a given model and token counts."""
    pricing = MODEL_PRICING.get(model_name or "", MODEL_PRICING["deepseek-v4-flash"])
    input_cost = (input_tokens / 1_000_000) * pricing[0]
    output_cost = (output_tokens / 1_000_000) * pricing[1]
    return input_cost + output_cost


async def _fetch_balance(api_key: str) -> BalanceInfo | None:
    """Fetch real balance from DeepSeek API."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.deepseek.com/user/balance",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if resp.status_code != 200:
                logger.warning("DeepSeek balance API returned %d", resp.status_code)
                return None
            data = resp.json()
            if not data.get("balance_infos"):
                return None
            info = data["balance_infos"][0]
            return BalanceInfo(
                currency=info.get("currency", "CNY"),
                total_balance=info.get("total_balance", "0.00"),
                topped_up_balance=info.get("topped_up_balance", "0.00"),
            )
    except Exception as exc:
        logger.warning("Failed to fetch DeepSeek balance: %s", exc)
        return None


@router.get("/overview", response_model=BillingOverviewResponse)
@require_permission("billing", "read")
async def get_billing_overview(request: Request) -> BillingOverviewResponse:
    """Get billing overview: DeepSeek balance + daily usage from DB."""
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")

    # 1. Fetch balance from DeepSeek API
    balance = await _fetch_balance(api_key)

    # 2. Query usage from runs table
    sf = get_session_factory()
    daily_usage: list[DailyUsage] = []
    total_in = 0
    total_out = 0
    total_tok = 0
    total_cost = 0.0

    if sf is not None:
        try:
            from sqlalchemy import text

            thirty_days_ago = (datetime.now(UTC) - timedelta(days=30)).isoformat()
            async with sf() as session:
                rows = await session.execute(
                    text("""
                        SELECT
                            DATE(created_at) as day,
                            model_name,
                            SUM(total_input_tokens) as total_in,
                            SUM(total_output_tokens) as total_out,
                            SUM(total_tokens) as total_tok
                        FROM runs
                        WHERE created_at >= :since
                        GROUP BY DATE(created_at), model_name
                        ORDER BY day ASC
                    """),
                    {"since": thirty_days_ago},
                )
                # Aggregate by day
                daily_map: dict[str, dict[str, Any]] = {}
                for row in rows:
                    day = row[0]
                    model = row[1] or "deepseek-v4-flash"
                    inp = row[2] or 0
                    out = row[3] or 0
                    tok = row[4] or 0

                    day_cost = _calculate_cost(model, inp, out)

                    if day not in daily_map:
                        daily_map[day] = {"date": day, "input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "cost": 0.0}

                    daily_map[day]["input_tokens"] += inp
                    daily_map[day]["output_tokens"] += out
                    daily_map[day]["total_tokens"] += tok
                    daily_map[day]["cost"] += day_cost
                    total_in += inp
                    total_out += out
                    total_tok += tok
                    total_cost += day_cost

                daily_usage = [DailyUsage(**v) for v in sorted(daily_map.values(), key=lambda x: x["date"])]
        except Exception as exc:
            logger.warning("Failed to query usage from DB: %s", exc)

    return BillingOverviewResponse(
        balance=balance,
        daily_usage=daily_usage,
        total_input_tokens=total_in,
        total_output_tokens=total_out,
        total_tokens=total_tok,
        total_cost=round(total_cost, 6),
    )
