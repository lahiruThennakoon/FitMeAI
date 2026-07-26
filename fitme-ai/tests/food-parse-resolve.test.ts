import { describe, it, expect, vi } from "vitest";
import {
  foodLookupQueries,
  resolveParsedMeal,
  resolvePortionGrams,
} from "@/lib/domain/nutrition/resolve-parse";
import type { FoodDetailDto } from "@/lib/domain/nutrition/types";
import type {
  FoodParseAiInput,
  FoodParseAiOutput,
} from "@/lib/ai/schemas/food-parse";

const eggFood: FoodDetailDto = {
  slug: "egg",
  name: "Egg",
  aliases: ["eggs", "boiled egg"],
  kind: "simple",
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

const chickpeas: FoodDetailDto = {
  slug: "chickpeas",
  name: "Chickpeas",
  aliases: ["kadala"],
  kind: "simple",
  defaultServingG: 100,
  sourceLabel: "seed",
  servings: [{ name: "100g", grams: 100 }],
  ingredients: [],
  nutrition: {
    energyKcal: 164,
    proteinG: 8.9,
    carbsG: 27.4,
    fatG: 2.6,
    fibreG: 7.6,
    sugarG: 4.8,
    sodiumMg: 7,
  },
  dataSource: "database",
};

describe("resolvePortionGrams", () => {
  it("uses grams directly and piece servings", () => {
    expect(resolvePortionGrams(100, "g", chickpeas)).toBe(100);
    expect(resolvePortionGrams(2, "piece", eggFood)).toBe(100);
  });
});

describe("foodLookupQueries", () => {
  it("strips leading counts and simple plurals", () => {
    expect(foodLookupQueries("two eggs")).toEqual(
      expect.arrayContaining(["two eggs", "eggs", "egg"]),
    );
  });
});

describe("resolveParsedMeal (FR-6)", () => {
  it("assigns database source for catalog matches and scales macros", async () => {
    const ai: FoodParseAiOutput = {
      items: [
        {
          name: "two eggs",
          quantity: 2,
          unit: "piece",
          confidence: 0.95,
        },
        {
          name: "chickpeas",
          quantity: 100,
          unit: "g",
          confidence: 0.9,
        },
      ],
      inferredMealType: "breakfast",
    };

    const findFood = vi.fn(async (q: string) => {
      const lower = q.toLowerCase();
      if (lower.includes("egg")) return eggFood;
      if (lower.includes("chickpea")) return chickpeas;
      return null;
    });

    let n = 0;
    const draft = await resolveParsedMeal(ai, 40, {
      findFoodBySlugOrAlias: findFood,
      now: () => new Date("2026-07-26T08:00:00.000Z"),
      idFactory: () => `id${++n}`,
    });

    expect(draft.items).toHaveLength(2);
    expect(draft.items[0].dataSource).toBe("database");
    expect(draft.items[0].nutrition.energyKcal).toBe(144);
    expect(draft.items[0].catalog?.defaultServingG).toBe(50);
    expect(draft.items[1].dataSource).toBe("database");
    expect(draft.items[1].nutrition.energyKcal).toBe(164);
    expect(draft.items[0].mealType).toBe("breakfast");
  });

  it("flags unsupported units for clarification", async () => {
    const ai: FoodParseAiOutput = {
      items: [
        {
          name: "egg",
          quantity: 1,
          unit: "bowl",
          confidence: 0.9,
        },
      ],
    };
    const draft = await resolveParsedMeal(ai, 10, {
      findFoodBySlugOrAlias: async () => eggFood,
      idFactory: () => "e1",
    });
    expect(draft.items[0].needsClarification).toBe(true);
  });

  it("marks unknown foods ai_estimated and flags low confidence", async () => {
    // Pre-Zod payload (null fibre/sugar) — resolve fills 0 for the UI.
    const ai = {
      items: [
        {
          name: "grandma jackfruit curry",
          quantity: 1,
          unit: "bowl",
          confidence: 0.4,
          needsClarification: true,
          estimate: {
            energyKcal: 320,
            proteinG: 8,
            carbsG: 40,
            fatG: 12,
            fibreG: null,
            sugarG: null,
            sodiumMg: null,
          },
        },
      ],
    } as FoodParseAiInput;

    const draft = await resolveParsedMeal(ai, 20, {
      findFoodBySlugOrAlias: async () => null,
      idFactory: () => "u1",
    });

    expect(draft.items[0].dataSource).toBe("ai_estimated");
    expect(draft.items[0].nutrition.energyKcal).toBe(320);
    expect(draft.items[0].nutrition.fibreG).toBe(0);
    expect(draft.items[0].nutrition.sugarG).toBe(0);
    expect(draft.items[0].needsClarification).toBe(true);
    expect(draft.items[0].foodSlug).toBeNull();
    expect(draft.items[0].breakdown).toBeNull();
    expect(draft.items[0].kind).toBe("estimated");
  });
});
