/**
 * Multi-region nutrition seed (Story 12.1).
 * Ingredient values approximate USDA FDC / IFCT-style open data (per 100 g).
 * Dish proportions are hand-curated per locale shard.
 */

import ingredientsGlobal from "./catalog/ingredients.global.json";
import foodsLk from "./catalog/foods.lk.json";
import foodsUs from "./catalog/foods.us.json";
import foodsIn from "./catalog/foods.in.json";
import foodsEu from "./catalog/foods.eu.json";

export type CatalogLocale = "lk" | "us" | "in" | "eu" | "global";

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
  locale?: CatalogLocale;
  recipe: Record<string, number>;
  servings: { name: string; grams: number }[];
};

type FoodShard = { locale: CatalogLocale; foods: Omit<SeedFood, "locale">[] };

const FOOD_SHARDS: FoodShard[] = [
  foodsLk as unknown as FoodShard,
  foodsUs as unknown as FoodShard,
  foodsIn as unknown as FoodShard,
  foodsEu as unknown as FoodShard,
];

function mergeCatalog() {
  const ingredients = ingredientsGlobal.ingredients as SeedIngredient[];
  const foods: SeedFood[] = [];
  for (const shard of FOOD_SHARDS) {
    for (const food of shard.foods) {
      foods.push({ ...food, locale: shard.locale });
    }
  }
  return { ingredients, foods };
}

const catalog = mergeCatalog();

export const SEED_INGREDIENTS: SeedIngredient[] =
  catalog.ingredients as SeedIngredient[];

export const SEED_FOODS: SeedFood[] = catalog.foods as SeedFood[];

/** Foods the Story 2.1 AC names explicitly. */
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

// Validate at import time (tests + seed).
validateSeedCatalog();
