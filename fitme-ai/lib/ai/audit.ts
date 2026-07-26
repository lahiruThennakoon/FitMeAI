import { purposeForLog } from "@/lib/ai/log-meta";
import type { FoodParseAiOutput } from "@/lib/ai/schemas/food-parse";

/** Redacted request context for AIInteraction (FR-19) — never meal text. */
export type AiRequestMeta = {
  purpose: string;
  promptCharLength: number;
};

/** Structured response summary stored on success (DB audit only). */
export type AiResponseSummary = {
  itemCount: number;
  inferredMealType?: string;
  items: Array<{
    name: string;
    confidence: number;
    unit: string;
    quantity: number;
    hasEstimate: boolean;
  }>;
};

export function buildAiRequestMeta(
  purpose: string,
  promptCharLength: number,
): AiRequestMeta {
  return {
    purpose: purposeForLog(purpose),
    promptCharLength: Math.max(0, Math.floor(promptCharLength)),
  };
}

export function buildFoodParseResponseSummary(
  data: FoodParseAiOutput,
): AiResponseSummary {
  return {
    itemCount: data.items.length,
    inferredMealType: data.inferredMealType,
    items: data.items.map((item) => ({
      name: item.name,
      confidence: item.confidence,
      unit: item.unit,
      quantity: item.quantity,
      hasEstimate: item.estimate != null,
    })),
  };
}

export function averageConfidence(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

/**
 * Keys that must never appear in AI application-log meta (FR-31).
 * Complements logger key redaction — used in tests as a contract.
 */
export const AI_LOG_FORBIDDEN_KEYS = [
  "text",
  "userPrompt",
  "prompt",
  "rawText",
  "meal",
  "email",
  "password",
] as const;

export function assertSafeAiLogMeta(meta: Record<string, unknown>): boolean {
  return !AI_LOG_FORBIDDEN_KEYS.some((k) => k in meta);
}
