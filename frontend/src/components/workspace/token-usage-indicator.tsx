"use client";

import type { Message } from "@langchain/langgraph-sdk";
import {
  ChevronDownIcon,
  CoinsIcon,
  DollarSignIcon,
  TrendingUpIcon,
  CalendarDaysIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBackendBaseURL } from "@/core/config";
import { useI18n } from "@/core/i18n/hooks";
import {
  formatCost,
  formatTokenCount,
  selectHeaderTokenUsage,
  type TokenUsage,
} from "@/core/messages/usage";
import {
  getTokenUsageViewPreset,
  tokenUsagePreferencesFromPreset,
  type TokenUsagePreferences,
  type TokenUsageViewPreset,
} from "@/core/messages/usage-model";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Billing types (from /api/billing/overview)
// ---------------------------------------------------------------------------

interface BalanceInfo {
  currency: string;
  total_balance: string;
  topped_up_balance: string;
}

interface DailyUsage {
  date: string;
  total_tokens: number;
  cost: number;
}

interface BillingData {
  balance: BalanceInfo | null;
  daily_usage: DailyUsage[];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TokenUsageIndicatorProps {
  threadId?: string;
  messages: Message[];
  pendingMessages?: Message[];
  backendUsage?: TokenUsage | null;
  enabled?: boolean;
  preferences: TokenUsagePreferences;
  onPreferencesChange: (preferences: TokenUsagePreferences) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TokenUsageIndicator({
  threadId,
  messages,
  pendingMessages,
  backendUsage,
  enabled = false,
  preferences,
  onPreferencesChange,
  className,
}: TokenUsageIndicatorProps) {
  const { t } = useI18n();
  const [billing, setBilling] = useState<BillingData | null>(null);

  // Fetch billing data on mount
  useEffect(() => {
    fetch(`${getBackendBaseURL()}/api/billing/overview`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setBilling(d))
      .catch(() => {});
  }, []);

  const usage = useMemo(
    () =>
      selectHeaderTokenUsage({
        backendUsage: threadId ? backendUsage : null,
        messages,
        pendingMessages,
      }),
    [backendUsage, messages, pendingMessages, threadId],
  );
  const preset = getTokenUsageViewPreset(preferences);

  const today = billing?.daily_usage?.slice(-1)?.[0];
  const weekUsage = billing?.daily_usage?.slice(-7) ?? [];

  if (!enabled) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "text-muted-foreground bg-background/70 hover:bg-background/90 flex h-auto items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-normal",
            className,
          )}
        >
          <CoinsIcon size={14} />
          <span className="font-mono">
            {billing?.balance
              ? `¥${billing.balance.total_balance}`
              : t.tokenUsage.label}
          </span>
          <ChevronDownIcon className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-80">
        {/* ── Token Usage ── */}
        <DropdownMenuLabel>{t.tokenUsage.title}</DropdownMenuLabel>
        <div className="px-2 py-1 text-xs">
          {usage ? (
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span>{t.tokenUsage.input}</span>
                <span className="font-mono">
                  {formatTokenCount(usage.inputTokens)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t.tokenUsage.output}</span>
                <span className="font-mono">
                  {formatTokenCount(usage.outputTokens)}
                </span>
              </div>
              <div className="border-t pt-1">
                <div className="flex justify-between gap-4">
                  <span>{t.tokenUsage.total}</span>
                  <span className="font-mono font-medium">
                    {formatTokenCount(usage.totalTokens)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">
              {t.tokenUsage.unavailable}
            </div>
          )}
        </div>

        {/* ── Account Balance ── */}
        {billing?.balance && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <DollarSignIcon size={16} className="text-amber-500" />
                账户余额
              </div>
              <div className="text-muted-foreground space-y-0.5 pl-6 text-xs">
                <div className="flex justify-between">
                  <span>可用余额</span>
                  <span className="font-mono font-medium text-amber-600">
                    ¥{billing.balance.total_balance}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Today's Usage ── */}
        {today && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <CalendarDaysIcon size={16} className="text-blue-500" />
                今日用量
              </div>
              <div className="text-muted-foreground space-y-0.5 pl-6 text-xs">
                <div className="flex justify-between">
                  <span>Token 总计</span>
                  <span className="font-mono">
                    {formatTokenCount(today.total_tokens)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>预估费用</span>
                  <span className="font-mono">
                    {formatCost(today.cost)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Weekly Trend ── */}
        {weekUsage.length > 0 && (
          <>
            <DropdownMenuSeparator />
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
                  <span className="font-mono">
                    {formatCost(weekUsage.reduce((s, d) => s + d.cost, 0))}
                  </span>
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
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t.tokenUsage.view}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preset}
          onValueChange={(value) =>
            onPreferencesChange(
              tokenUsagePreferencesFromPreset(value as TokenUsageViewPreset),
            )
          }
        >
          {(
            ["off", "summary", "per_turn", "debug"] as TokenUsageViewPreset[]
          ).map((value) => {
            const translationKey = presetKeyToTranslationKey(value);
            return (
              <DropdownMenuRadioItem key={value} value={value}>
                <div className="grid gap-0.5">
                  <span>{t.tokenUsage.presets[translationKey]}</span>
                  <span className="text-muted-foreground text-xs">
                    {t.tokenUsage.presetDescriptions[translationKey]}
                  </span>
                </div>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <div className="text-muted-foreground px-2 py-2 text-xs leading-relaxed">
          {t.tokenUsage.note}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function presetKeyToTranslationKey(preset: TokenUsageViewPreset) {
  switch (preset) {
    case "per_turn":
      return "perTurn" as const;
    default:
      return preset;
  }
}
