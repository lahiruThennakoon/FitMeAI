import { describe, it, expect } from "vitest";
import {
  recomputeDraftNutrition,
  scaleDraftNutritionByQuantity,
} from "@/lib/domain/nutrition/draft-recompute";
import type { ParsedFoodItemDraft } from "@/lib/domain/nutrition/parse-types";

const base: ParsedFoodItemDraft = {
  id: "1",
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
};

describe("recomputeDraftNutrition", () => {
  it("scales macros when quantity changes", () => {
    const next = recomputeDraftNutrition({ ...base, quantity: 2 });
    expect(next.nutrition.energyKcal).toBe(144);
  });

  it("flags unsupported unit changes", () => {
    const next = recomputeDraftNutrition({ ...base, unit: "bowl" });
    expect(next.needsClarification).toBe(true);
    expect(next.nutrition.energyKcal).toBe(72);
  });

  it("scales stored macros without catalog when quantity changes", () => {
    const next = scaleDraftNutritionByQuantity({ ...base, quantity: 2, catalog: null }, 1);
    expect(next.nutrition.energyKcal).toBe(144);
  });
});
