"use client";

import {
  DollarSignIcon,
  TrendingUpIcon,
  CoinsIcon,
  CalendarDaysIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBackendBaseURL } from "@/core/config";
import { useI18n } from "@/core/i18n/hooks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BalanceInfo {
  currency: string;
  total_balance: string;
  topped_up_balance: string;
}

interface DailyUsage {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
}

interface BillingOverview {
  balance: BalanceInfo | null;
  daily_usage: DailyUsage[];
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCost(cost: number): string {
  if (cost < 0.01) return `¥${cost.toFixed(4)}`;
  if (cost < 1) return `¥${cost.toFixed(3)}`;
  return `¥${cost.toFixed(2)}`;
}

function formatTokenCount(count: number): string {
  if (count < 10_000) return count.toLocaleString();
  return `${(count / 1000).toFixed(1)}K`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BillingOverview() {
  const { t } = useI18n();
  const [data, setData] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${getBackendBaseURL()}/api/billing/overview`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!data) return null;

  const weekUsage = data.daily_usage.slice(-7);
  const weekCost = weekUsage.reduce((s, d) => s + d.cost, 0);
  const today = data.daily_usage[data.daily_usage.length - 1];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground hover:bg-background/90 flex h-auto items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-normal"
        >
          <DollarSignIcon size={14} />
          <span className="font-mono">
            {data.balance
              ? `¥${data.balance.total_balance}`
              : loading
                ? "..."
                : "-"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-80">
        <DropdownMenuLabel>费用概览</DropdownMenuLabel>

        {/* Balance */}
        {data.balance && (
          <div className="px-2 py-1.5">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium">
              <CoinsIcon size={16} className="text-amber-500" />
              账户余额
            </div>
            <div className="text-muted-foreground space-y-0.5 pl-6 text-xs">
              <div className="flex justify-between">
                <span>可用余额</span>
                <span className="font-mono font-medium text-amber-600">
                  ¥{data.balance.total_balance}
                </span>
              </div>
              <div className="flex justify-between">
                <span>充值金额</span>
                <span className="font-mono">
                  ¥{data.balance.topped_up_balance}
                </span>
              </div>
            </div>
          </div>
        )}

        <DropdownMenuSeparator />

        {/* Today's Usage */}
        <div className="px-2 py-1.5">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium">
            <CalendarDaysIcon size={16} className="text-blue-500" />
            今日用量
          </div>
          <div className="text-muted-foreground space-y-0.5 pl-6 text-xs">
            <div className="flex justify-between">
              <span>Token 总计</span>
              <span className="font-mono">
                {today ? formatTokenCount(today.total_tokens) : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>预估费用</span>
              <span className="font-mono">
                {today ? formatCost(today.cost) : "-"}
              </span>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Weekly */}
        <div className="px-2 py-1.5">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium">
            <TrendingUpIcon size={16} className="text-green-500" />
            近 7 天
          </div>
          <div className="text-muted-foreground space-y-0.5 pl-6 text-xs">
            <div className="flex justify-between">
              <span>Token 总计</span>
              <span className="font-mono">
                {formatTokenCount(weekUsage.reduce((s, d) => s + d.total_tokens, 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span>预估费用</span>
              <span className="font-mono">{formatCost(weekCost)}</span>
            </div>
            <div className="mt-1 space-y-0.5">
              {weekUsage.map((d) => (
                <div key={d.date} className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground/70">{d.date.slice(5)}</span>
                  <span className="font-mono">
                    {formatTokenCount(d.total_tokens)} / {formatCost(d.cost)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
