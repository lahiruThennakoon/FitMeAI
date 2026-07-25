/**
 * Hybrid Sri Lankan nutrition seed (Story 2.1).
 * Ingredient values approximate USDA FoodData Central–style open data (per 100 g)
 * unless noted. Dish proportions are hand-curated for FitMe MVP — not lab assays.
 * Missing macros stay null (never fabricated as 0).
 *
 * Data lives in catalog-data.json so Prisma seed can run as plain Node (no tsx).
 */

import catalogData from "./catalog-data.json";

export type SeedIngredient = {
  slug: string;
  name: string;
  aliases?: string[];
  sourceLabel: string;
  energyKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fibreG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
};

export type SeedFood = {
  slug: string;
  name: string;
  aliases?: string[];
  kind: "simple" | "composite";
  sourceLabel: string;
  /** ingredientSlug → grams in default recipe */
  recipe: Record<string, number>;
  servings: { name: string; grams: number }[];
};

export const SEED_INGREDIENTS: SeedIngredient[] =
  catalogData.ingredients as SeedIngredient[];

export const SEED_FOODS: SeedFood[] = catalogData.foods as unknown as SeedFood[];

/** Foods the story AC names explicitly. */
export const REQUIRED_FOOD_SLUGS = ["rice", "pol-sambol", "dhal-curry"] as const;

export function defaultServingGrams(food: SeedFood): number {
  return Object.values(food.recipe).reduce((a, b) => a + b, 0);
}

/** Fail fast on invalid seed data (positive grams, unique slugs, known ingredients). */
export function validateSeedCatalog(
  ingredients: SeedIngredient[] = SEED_INGREDIENTS,
  foods: SeedFood[] = SEED_FOODS,
): void {
  const ingredientSlugs = new Set<string>();
  for (const ing of ingredients) {
    if (ingredientSlugs.has(ing.slug)) {
      throw new Error(`Duplicate ingredient slug in seed: ${ing.slug}`);
    }
    ingredientSlugs.add(ing.slug);
  }

  const foodSlugs = new Set<string>();
  for (const food of foods) {
    if (foodSlugs.has(food.slug)) {
      throw new Error(`Duplicate food slug in seed: ${food.slug}`);
    }
    foodSlugs.add(food.slug);

    const recipeEntries = Object.entries(food.recipe);
    if (recipeEntries.length === 0) {
      throw new Error(`Food ${food.slug} has empty recipe`);
    }
    for (const [ingSlug, grams] of recipeEntries) {
      if (!ingredientSlugs.has(ingSlug)) {
        throw new Error(`Unknown ingredient slug in seed: ${ingSlug}`);
      }
      if (!Number.isInteger(grams) || grams <= 0) {
        throw new Error(
          `${food.slug} recipe ${ingSlug} must be a positive integer gram amount`,
        );
      }
    }
    for (const serving of food.servings) {
      if (!Number.isInteger(serving.grams) || serving.grams <= 0) {
        throw new Error(
          `${food.slug} serving ${serving.name} must be a positive integer gram amount`,
        );
      }
    }
  }
}
