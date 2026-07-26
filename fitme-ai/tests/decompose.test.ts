import { describe, it, expect } from "vitest";
import { sumNutrition } from "@/lib/domain/nutrition/compose";
import {
  applyProportionEdit,
  decomposeFoodPortion,
  normalizeProportions,
  rescaleBreakdown,
} from "@/lib/domain/nutrition/decompose";
import type { FoodDetailDto } from "@/lib/domain/nutrition/types";
import type { ParsedFoodItemDraft } from "@/lib/domain/nutrition/parse-types";
import { buildFoodDetail } from "@/lib/domain/nutrition/food-detail";
import type { IngredientDto } from "@/lib/domain/nutrition/types";

const coconut: IngredientDto = {
  slug: "coconut-grated",
  name: "Coconut, grated",
  aliases: [],
  sourceLabel: "test",
  per100g: {
    energyKcal: 354,
    proteinG: 3.3,
    carbsG: 15.2,
    fatG: 33.5,
    fibreG: 9,
    sugarG: 6.2,
    sodiumMg: 20,
  },
};

const onion: IngredientDto = {
  slug: "onion-red",
  name: "Red onion",
  aliases: [],
  sourceLabel: "test",
  per100g: {
    energyKcal: 40,
    proteinG: 1.1,
    carbsG: 9.3,
    fatG: 0.1,
    fibreG: 1.7,
    sugarG: 4.2,
    sodiumMg: 4,
  },
};

const chili: IngredientDto = {
  slug: "chili-green",
  name: "Green chili",
  aliases: [],
  sourceLabel: "test",
  per100g: {
    energyKcal: 40,
    proteinG: 2,
    carbsG: 9.5,
    fatG: 0.2,
    fibreG: 1.5,
    sugarG: 5.1,
    sodiumMg: 7,
  },
};

const polSambol: FoodDetailDto = buildFoodDetail({
  slug: "pol-sambol",
  name: "Pol sambol",
  aliases: [],
  kind: "composite",
  defaultServingG: 93,
  sourceLabel: "test",
  servings: [{ name: "side portion", grams: 40 }],
  recipe: [
    { ingredient: coconut, grams: 60 },
    { ingredient: onion, grams: 20 },
    { ingredient: chili, grams: 8 },
    {
      ingredient: {
        slug: "lime-juice",
        name: "Lime juice",
        aliases: [],
        sourceLabel: "test",
        per100g: {
          energyKcal: 25,
          proteinG: 0.4,
          carbsG: 8.4,
          fatG: 0.1,
          fibreG: 0.4,
          sugarG: 1.7,
          sodiumMg: 2,
        },
      },
      grams: 5,
    },
  ],
});

describe("normalizeProportions", () => {
  it("sums to 100", () => {
    const pcts = normalizeProportions([50, 30, 10]);
    expect(pcts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });
});

describe("decomposeFoodPortion (FR-7)", () => {
  it("totals equal sum of ingredient contributions", () => {
    const result = decomposeFoodPortion(polSambol, 93);
    expect(result).not.toBeNull();
    const fromLines = sumNutrition(
      result!.breakdown.map((l) => l.contribution),
    );
    expect(result!.nutrition).toEqual(fromLines);
    expect(result!.breakdown.length).toBe(4);
    const pctSum = result!.breakdown.reduce((a, l) => a + l.proportionPct, 0);
    expect(pctSum).toBeCloseTo(100, 5);
  });

  it("returns null for simple single-ingredient foods", () => {
    const egg = buildFoodDetail({
      slug: "egg",
      name: "Egg",
      aliases: [],
      kind: "simple",
      defaultServingG: 50,
      sourceLabel: "test",
      servings: [],
      recipe: [{ ingredient: onion, grams: 50 }],
    });
    expect(decomposeFoodPortion(egg, 50)).toBeNull();
  });
});

describe("proportion edits recompute", () => {
  it("normalizes and updates parent nutrition", () => {
    const decomposed = decomposeFoodPortion(polSambol, 93)!;
    const item: ParsedFoodItemDraft = {
      id: "1",
      name: "Pol sambol",
      quantity: 1,
      unit: "serving",
      mealType: "lunch",
      loggedAt: "2026-07-26T12:00:00.000Z",
      dataSource: "database",
      confidence: 0.9,
      needsClarification: false,
      nutrition: decomposed.nutrition,
      foodSlug: "pol-sambol",
      catalog: {
        defaultServingG: 93,
        nutritionAtDefault: polSambol.nutrition,
        servings: polSambol.servings,
      },
      breakdown: decomposed.breakdown,
      kind: "composite",
      origin: "ai_parse",
      aiSnapshot: null,
    };

    const edited = applyProportionEdit(item, "coconut-grated", 80);
    const pctSum = edited.breakdown!.reduce((a, l) => a + l.proportionPct, 0);
    expect(pctSum).toBeCloseTo(100, 5);
    expect(edited.nutrition).toEqual(
      sumNutrition(edited.breakdown!.map((l) => l.contribution)),
    );
    const coconut = edited.breakdown!.find(
      (l) => l.ingredientSlug === "coconut-grated",
    );
    expect(coconut!.proportionPct).toBe(80);

    const zeroed = applyProportionEdit(item, "chili-green", 0);
    expect(
      zeroed.breakdown!.find((l) => l.ingredientSlug === "chili-green")
        ?.proportionPct,
    ).toBe(0);
    expect(zeroed.nutrition.energyKcal).not.toBeNull();
    expect(zeroed.nutrition.energyKcal).toBeGreaterThan(0);
  });

  it("rescaleBreakdown keeps proportions", () => {
    const decomposed = decomposeFoodPortion(polSambol, 93)!;
    const scaled = rescaleBreakdown(decomposed.breakdown, 186);
    expect(scaled.reduce((a, l) => a + l.grams, 0)).toBeCloseTo(186, 0);
    expect(scaled.reduce((a, l) => a + l.proportionPct, 0)).toBeCloseTo(100, 5);
  });
});
