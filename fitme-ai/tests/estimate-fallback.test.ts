import { describe, it, expect } from "vitest";
import {
  buildCatalogDraft,
  buildEstimatedDraft,
  isAiEstimatedDraft,
  nutritionFromAiEstimate,
} from "@/lib/domain/nutrition/estimate-fallback";
import type { FoodDetailDto } from "@/lib/domain/nutrition/types";

const identity = {
  id: "d1",
  quantity: 1,
  unit: "serving" as const,
  mealType: "lunch" as const,
  loggedAt: "2026-07-26T12:00:00.000Z",
  confidence: 0.55,
  origin: "ai_parse" as const,
  aiSnapshot: null,
};

const egg: FoodDetailDto = {
  slug: "egg",
  name: "Egg",
  aliases: ["eggs"],
  kind: "simple",
  locale: "global",
  defaultServingG: 50,
  sourceLabel: "seed",
  servings: [{ name: "piece", grams: 50 }],
  ingredients: [],
  nutrition: {
    energyKcal: 72,
    proteinG: 6.3,
    carbsG: 0.4,
    fatG: 4.8,
    fibreG: 0,
    sugarG: 0.2,
    sodiumMg: 71,
  },
  dataSource: "database",
};

describe("nutritionFromAiEstimate (FR-11)", () => {
  it("fills fibre/sugar blanks with 0", () => {
    const n = nutritionFromAiEstimate({
      energyKcal: 165,
      proteinG: 24,
      carbsG: 1,
      fatG: 6,
      fibreG: null,
      sugarG: null,
      sodiumMg: 70,
    });
    expect(n.fibreG).toBe(0);
    expect(n.sugarG).toBe(0);
    expect(n.energyKcal).toBe(165);
  });
});

describe("buildEstimatedDraft (FR-11)", () => {
  it("never claims database provenance", () => {
    const draft = buildEstimatedDraft(
      "grandma jackfruit curry",
      identity,
      {
        energyKcal: 320,
        proteinG: 8,
        carbsG: 40,
        fatG: 12,
        fibreG: 5,
        sugarG: 10,
        sodiumMg: 400,
      },
    );
    expect(draft.dataSource).toBe("ai_estimated");
    expect(draft.kind).toBe("estimated");
    expect(draft.foodSlug).toBeNull();
    expect(draft.needsClarification).toBe(true);
    expect(isAiEstimatedDraft(draft)).toBe(true);
    expect(draft.aiSnapshot).not.toBeNull();
  });
});

describe("buildCatalogDraft prefers database over estimate", () => {
  it("labels matched foods as database", () => {
    const draft = buildCatalogDraft(egg, {
      ...identity,
      quantity: 2,
      unit: "piece",
      confidence: 0.9,
    });
    expect(draft.dataSource).toBe("database");
    expect(draft.foodSlug).toBe("egg");
    expect(draft.nutrition.energyKcal).toBe(144);
    expect(isAiEstimatedDraft(draft)).toBe(false);
  });
});
