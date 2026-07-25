import { describe, it, expect } from "vitest";
import { scalePer100g, sumNutrition } from "@/lib/domain/nutrition/compose";
import { buildFoodDetail } from "@/lib/domain/nutrition/food-detail";
import type { IngredientDto } from "@/lib/domain/nutrition/types";
import {
  REQUIRED_FOOD_SLUGS,
  SEED_FOODS,
  SEED_INGREDIENTS,
  defaultServingGrams,
  validateSeedCatalog,
} from "../prisma/seed/catalog";

const rice: IngredientDto = {
  slug: "rice-white-cooked",
  name: "White rice, cooked",
  aliases: ["rice"],
  sourceLabel: "test",
  per100g: {
    energyKcal: 130,
    proteinG: 2.7,
    carbsG: 28.2,
    fatG: 0.3,
    fibreG: 0.4,
    sugarG: 0.1,
    sodiumMg: 1,
  },
};

describe("scalePer100g / sumNutrition", () => {
  it("scales per-100g macros to portion grams", () => {
    const n = scalePer100g(rice.per100g, 150);
    expect(n.energyKcal).toBe(195);
    expect(n.proteinG).toBe(4.1);
  });

  it("keeps null macros null when summing (never fabricates 0)", () => {
    const a = scalePer100g(
      { ...rice.per100g, fibreG: null },
      50,
    );
    const b = scalePer100g(rice.per100g, 50);
    const total = sumNutrition([a, b]);
    expect(total.fibreG).toBeNull();
    expect(total.energyKcal).not.toBeNull();
  });
});

describe("buildFoodDetail (AD-3 provenance)", () => {
  it("marks catalog foods as dataSource database and sums ingredients", () => {
    const detail = buildFoodDetail({
      slug: "rice",
      name: "Rice (cooked)",
      aliases: [],
      kind: "simple",
      defaultServingG: 150,
      sourceLabel: "seed",
      servings: [{ name: "default", grams: 150 }],
      recipe: [{ ingredient: rice, grams: 150 }],
    });
    expect(detail.dataSource).toBe("database");
    expect(detail.ingredients).toHaveLength(1);
    expect(detail.nutrition.energyKcal).toBe(195);
  });
});

describe("Sri Lankan seed catalog", () => {
  it("includes required AC foods and unique slugs", () => {
    const slugs = SEED_FOODS.map((f) => f.slug);
    for (const required of REQUIRED_FOOD_SLUGS) {
      expect(slugs).toContain(required);
    }
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(SEED_INGREDIENTS.map((i) => i.slug)).size).toBe(
      SEED_INGREDIENTS.length,
    );
    expect(() => validateSeedCatalog()).not.toThrow();
  });

  it("resolves composite pol sambol to multiple ingredients", () => {
    const pol = SEED_FOODS.find((f) => f.slug === "pol-sambol");
    expect(pol?.kind).toBe("composite");
    expect(Object.keys(pol!.recipe).length).toBeGreaterThan(1);
    expect(defaultServingGrams(pol!)).toBeGreaterThan(0);
  });

  it("references only known ingredient slugs", () => {
    const known = new Set(SEED_INGREDIENTS.map((i) => i.slug));
    for (const food of SEED_FOODS) {
      for (const ing of Object.keys(food.recipe)) {
        expect(known.has(ing)).toBe(true);
      }
    }
  });

  it("composes AC foods bottom-up with dataSource database", () => {
    const bySlug = new Map(
      SEED_INGREDIENTS.map((i) => {
        const dto: IngredientDto = {
          slug: i.slug,
          name: i.name,
          aliases: i.aliases ?? [],
          sourceLabel: i.sourceLabel,
          per100g: {
            energyKcal: i.energyKcal,
            proteinG: i.proteinG,
            carbsG: i.carbsG,
            fatG: i.fatG,
            fibreG: i.fibreG,
            sugarG: i.sugarG,
            sodiumMg: i.sodiumMg,
          },
        };
        return [i.slug, dto] as const;
      }),
    );

    for (const slug of REQUIRED_FOOD_SLUGS) {
      const food = SEED_FOODS.find((f) => f.slug === slug)!;
      const detail = buildFoodDetail({
        slug: food.slug,
        name: food.name,
        aliases: food.aliases ?? [],
        kind: food.kind,
        defaultServingG: defaultServingGrams(food),
        sourceLabel: food.sourceLabel,
        servings: food.servings,
        recipe: Object.entries(food.recipe).map(([ingSlug, grams]) => ({
          ingredient: bySlug.get(ingSlug)!,
          grams,
        })),
      });
      expect(detail.dataSource).toBe("database");
      expect(detail.ingredients.length).toBe(Object.keys(food.recipe).length);
      expect(detail.nutrition.energyKcal).not.toBeNull();
      expect(detail.nutrition.energyKcal).toBeGreaterThan(0);
    }

    // coconut-milk fibre is null → dhal curry fibre total stays null
    const dhal = SEED_FOODS.find((f) => f.slug === "dhal-curry")!;
    const dhalDetail = buildFoodDetail({
      slug: dhal.slug,
      name: dhal.name,
      aliases: dhal.aliases ?? [],
      kind: dhal.kind,
      defaultServingG: defaultServingGrams(dhal),
      sourceLabel: dhal.sourceLabel,
      servings: dhal.servings,
      recipe: Object.entries(dhal.recipe).map(([ingSlug, grams]) => ({
        ingredient: bySlug.get(ingSlug)!,
        grams,
      })),
    });
    expect(dhalDetail.nutrition.fibreG).toBeNull();
  });
});
