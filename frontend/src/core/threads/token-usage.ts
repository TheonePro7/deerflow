import { calculateCost, type TokenUsage } from "@/core/messages/usage";

import type { ThreadTokenUsageResponse } from "./types";

export function threadTokenUsageQueryKey(threadId?: string | null) {
  return ["thread-token-usage", threadId] as const;
}

export function threadTokenUsageToTokenUsage(
  usage: ThreadTokenUsageResponse | null | undefined,
): TokenUsage | null {
  if (!usage) {
    return null;
  }

  // Calculate cost from per-model breakdown when available
  let totalInputCost = 0;
  let totalOutputCost = 0;
  if (usage.by_model && Object.keys(usage.by_model).length > 0) {
    for (const [modelName, modelUsage] of Object.entries(usage.by_model)) {
      // The API returns total tokens per model; approximate input/output split
      // by the global ratio since the backend only tracks total per model.
      const total = modelUsage.tokens;
      const globalRatio = usage.total_tokens > 0
        ? usage.total_input_tokens / usage.total_tokens
        : 0.5;
      const modelInput = Math.round(total * globalRatio);
      const modelOutput = total - modelInput;
      const cost = calculateCost(modelInput, modelOutput, modelName);
      totalInputCost += cost.inputCost;
      totalOutputCost += cost.outputCost;
    }
  }

  return {
    inputTokens: usage.total_input_tokens ?? 0,
    outputTokens: usage.total_output_tokens ?? 0,
    totalTokens: usage.total_tokens ?? 0,
    inputCost: totalInputCost,
    outputCost: totalOutputCost,
    totalCost: totalInputCost + totalOutputCost,
  };
}
