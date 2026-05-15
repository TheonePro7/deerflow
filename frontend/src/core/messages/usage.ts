import type { Message } from "@langchain/langgraph-sdk";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Estimated cost in USD, calculated from model pricing */
  inputCost?: number;
  outputCost?: number;
  totalCost?: number;
}

/** Model pricing per 1M tokens (in USD) */
const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "deepseek-v4-flash": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "deepseek-v4-pro":   { inputPer1M: 0.50, outputPer1M: 2.00 },
  "deepseek-v3":       { inputPer1M: 0.27, outputPer1M: 1.10 },
  "gpt-4o":            { inputPer1M: 2.50, outputPer1M: 10.00 },
  "gpt-4o-mini":       { inputPer1M: 0.15, outputPer1M: 0.60 },
  "claude-sonnet-4":   { inputPer1M: 3.00, outputPer1M: 15.00 },
  "claude-3.5-haiku":  { inputPer1M: 0.25, outputPer1M: 1.25 },
};

/**
 * Calculate estimated cost from token counts for a given model.
 * Falls back to DeepSeek V4 Flash pricing if the model is not found.
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelName?: string,
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = MODEL_PRICING[modelName ?? ""] ?? MODEL_PRICING["deepseek-v4-flash"]!;
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

/**
 * Extract usage_metadata from an AI message if present.
 * The field is added by the backend (PR #1218) but not typed in the SDK.
 */
export function getUsageMetadata(message: Message): TokenUsage | null {
  if (message.type !== "ai") {
    return null;
  }
  const usage = (message as Record<string, unknown>).usage_metadata as
    | { input_tokens?: number; output_tokens?: number; total_tokens?: number }
    | undefined;
  if (!usage) {
    return null;
  }
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    totalTokens: usage.total_tokens ?? 0,
  };
}

/**
 * Accumulate token usage across AI messages.
 *
 * UI rendering may place the same AI message in more than one group, such as
 * when a message contains both reasoning and final answer content. Token usage
 * is attached to the AI message itself, so a message id should only contribute
 * once to any aggregate.
 */
export function accumulateUsage(messages: Message[]): TokenUsage | null {
  const cumulative: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
  let hasUsage = false;
  const countedMessageIds = new Set<string>();

  for (const message of messages) {
    const usage = getUsageMetadata(message);
    if (!usage) {
      continue;
    }

    if (message.id) {
      if (countedMessageIds.has(message.id)) {
        continue;
      }
      countedMessageIds.add(message.id);
    }

    hasUsage = true;
    cumulative.inputTokens += usage.inputTokens;
    cumulative.outputTokens += usage.outputTokens;
    cumulative.totalTokens += usage.totalTokens;
  }
  return hasUsage ? cumulative : null;
}

function hasNonZeroUsage(
  usage: TokenUsage | null | undefined,
): usage is TokenUsage {
  return (
    usage !== null &&
    usage !== undefined &&
    (usage.inputTokens > 0 || usage.outputTokens > 0 || usage.totalTokens > 0)
  );
}

function addUsage(base: TokenUsage, delta: TokenUsage): TokenUsage {
  return {
    inputTokens: base.inputTokens + delta.inputTokens,
    outputTokens: base.outputTokens + delta.outputTokens,
    totalTokens: base.totalTokens + delta.totalTokens,
    inputCost: (base.inputCost ?? 0) + (delta.inputCost ?? 0),
    outputCost: (base.outputCost ?? 0) + (delta.outputCost ?? 0),
    totalCost: (base.totalCost ?? 0) + (delta.totalCost ?? 0),
  };
}

/**
 * Format a cost amount for display: 0.0023 -> "$0.0023", 0.12 -> "$0.12"
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `¥${cost.toFixed(4)}`;
  }
  if (cost < 1) {
    return `¥${cost.toFixed(3)}`;
  }
  return `¥${cost.toFixed(2)}`;
}

export function selectHeaderTokenUsage({
  backendUsage,
  messages,
  pendingMessages = [],
}: {
  backendUsage?: TokenUsage | null;
  messages: Message[];
  pendingMessages?: Message[];
}): TokenUsage | null {
  if (hasNonZeroUsage(backendUsage)) {
    const pendingUsage = accumulateUsage(pendingMessages);
    return pendingUsage ? addUsage(backendUsage, pendingUsage) : backendUsage;
  }
  return accumulateUsage(messages);
}

/**
 * Format a token count for display: 1234 -> "1,234", 12345 -> "12.3K"
 */
export function formatTokenCount(count: number): string {
  if (count < 10_000) {
    return count.toLocaleString();
  }
  return `${(count / 1000).toFixed(1)}K`;
}
