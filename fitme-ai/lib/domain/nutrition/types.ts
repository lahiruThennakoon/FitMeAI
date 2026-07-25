/**
 * Nutrition catalog DTOs (Story 2.1 / AD-3).
 * Catalog lookups always carry dataSource = "database".
 */

export type NutritionDataSource = "database" | "ai_estimated";

/** Macros for a portion. Null = unknown (never coerced to 0). */
export type NutritionMacros = {
  energyKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fibreG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
};

export type IngredientDto = {
  slug: string;
  name: string;
  aliases: string[];
  sourceLabel: string;
  /** Per 100 g. */
  per100g: NutritionMacros;
};

export type RecipeLineDto = {
  ingredient: IngredientDto;
  grams: number;
  /** Contribution for this line (scaled from per-100g). */
  contribution: NutritionMacros;
};

export type FoodServingDto = {
  name: string;
  grams: number;
};

export type FoodDetailDto = {
  slug: string;
  name: string;
  aliases: string[];
  kind: "simple" | "composite";
  defaultServingG: number;
  sourceLabel: string;
  servings: FoodServingDto[];
  ingredients: RecipeLineDto[];
  /** Totals for defaultServingG. */
  nutrition: NutritionMacros;
  dataSource: NutritionDataSource;
};
