import { describe, it, expect } from "vitest";
import {
  AI_LOG_FORBIDDEN_KEYS,
  assertSafeAiLogMeta,
  averageConfidence,
  buildAiRequestMeta,
  buildFoodParseResponseSummary,
} from "@/lib/ai/audit";
import { redact } from "@/lib/logging";

describe("AI audit builders (FR-19)", () => {
  it("builds request meta without meal text", () => {
    const meta = buildAiRequestMeta("food_parse", 42);
    expect(meta).toEqual({ purpose: "food_parse", promptCharLength: 42 });
    expect(JSON.stringify(meta)).not.toMatch(/eggs|rice|curry/i);
  });

  it("summarizes validated parse output for DB audit", () => {
    const summary = buildFoodParseResponseSummary({
      items: [
        {
          name: "egg",
          quantity: 2,
          unit: "piece",
          confidence: 0.9,
          estimate: {
            energyKcal: 144,
            proteinG: 12,
            carbsG: 1,
            fatG: 10,
            fibreG: 0,
            sugarG: 0,
            sodiumMg: 140,
          },
        },
      ],
      inferredMealType: "breakfast",
    });
    expect(summary.itemCount).toBe(1);
    expect(summary.items[0].hasEstimate).toBe(true);
    expect(summary.inferredMealType).toBe("breakfast");
  });

  it("averages confidence", () => {
    expect(averageConfidence([0.5, 1])).toBe(0.75);
    expect(averageConfidence([])).toBeNull();
  });
});

describe("AI log redaction contract (FR-31)", () => {
  it("forbids meal/prompt keys in AI log meta", () => {
    expect(
      assertSafeAiLogMeta({
        event: "food_parse_ok",
        purpose: "food_parse",
        itemCount: 2,
      }),
    ).toBe(true);
    for (const key of AI_LOG_FORBIDDEN_KEYS) {
      expect(assertSafeAiLogMeta({ [key]: "secret meal" })).toBe(false);
    }
  });

  it("redacts sensitive keys if accidentally passed to logger", () => {
    const out = redact({
      event: "food_parse_ok",
      email: "a@b.com",
      name: "two eggs",
      itemCount: 1,
    }) as Record<string, unknown>;
    expect(out.email).toBe("[Redacted]");
    expect(out.name).toBe("[Redacted]");
    expect(out.itemCount).toBe(1);
  });
});
