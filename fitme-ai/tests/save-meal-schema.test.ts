import { describe, it, expect } from "vitest";
import { snapshotFromDraft } from "@/lib/domain/nutrition/corrections";
import type { ParsedFoodItemDraft } from "@/lib/domain/nutrition/parse-types";
import { saveMealDraftSchema } from "@/lib/schemas/log";

function item(
  overrides: Partial<ParsedFoodItemDraft> = {},
): ParsedFoodItemDraft {
  const base: ParsedFoodItemDraft = {
    id: "a",
    name: "Egg",
    quantity: 1,
    unit: "piece",
    mealType: "breakfast",
    loggedAt: "2026-07-26T08:00:00.000Z",
    dataSource: "database",
    confidence: 0.9,
    needsClarification: false,
    nutrition: {
      energyKcal: 72,
      proteinG: 6.3,
      carbsG: 0.4,
      fatG: 4.8,
      fibreG: 0,
      sugarG: 0.2,
      sodiumMg: 71,
    },
    foodSlug: "egg",
    catalog: {
      defaultServingG: 50,
      nutritionAtDefault: {
        energyKcal: 72,
        proteinG: 6.3,
        carbsG: 0.4,
        fatG: 4.8,
        fibreG: 0,
        sugarG: 0.2,
        sodiumMg: 71,
      },
      servings: [{ name: "piece", grams: 50 }],
    },
    breakdown: null,
    kind: "simple",
    origin: "ai_parse",
    aiSnapshot: null,
    ...overrides,
  };
  if (base.origin === "ai_parse" && !base.aiSnapshot) {
    base.aiSnapshot = snapshotFromDraft(base);
  }
  return base;
}

describe("saveMealDraftSchema", () => {
  it("requires confirmed:true", () => {
    expect(saveMealDraftSchema.safeParse({ items: [item()] }).success).toBe(
      false,
    );
  });

  it("rejects ai_parse without snapshot", () => {
    const draft = item();
    draft.aiSnapshot = null;
    const result = saveMealDraftSchema.safeParse({
      confirmed: true,
      items: [draft],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate draft ids", () => {
    const a = item({ id: "same" });
    const b = item({ id: "same", name: "Other" });
    b.aiSnapshot = snapshotFromDraft(b);
    expect(
      saveMealDraftSchema.safeParse({ confirmed: true, items: [a, b] })
        .success,
    ).toBe(false);
  });

  it("rejects negative macros", () => {
    const bad = item({
      nutrition: {
        energyKcal: -1,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        fibreG: 0,
        sugarG: 0,
        sodiumMg: 0,
      },
    });
    expect(
      saveMealDraftSchema.safeParse({ confirmed: true, items: [bad] }).success,
    ).toBe(false);
  });

  it("accepts a valid confirmed payload", () => {
    expect(
      saveMealDraftSchema.safeParse({ confirmed: true, items: [item()] })
        .success,
    ).toBe(true);
  });
});
