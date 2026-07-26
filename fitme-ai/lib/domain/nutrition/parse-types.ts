import type { NutritionDataSource, NutritionMacros } from "@/lib/domain/nutrition/types";

export type MealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "unknown";

export type FoodParseUnit =
  | "g"
  | "piece"
  | "cup"
  | "tablespoon"
  | "bowl"
  | "plate"
  | "serving";

/** Catalog snapshot so the client can rescale macros after qty/unit edits. */
export type ParsedFoodCatalogRef = {
  defaultServingG: number;
  nutritionAtDefault: NutritionMacros;
  servings: { name: string; grams: number }[];
};

/** Draft item after AI parse + catalog match (not persisted — Story 2.6). */
export type ParsedFoodItemDraft = {
  id: string;
  name: string;
  quantity: number;
  unit: FoodParseUnit;
  mealType: MealType;
  loggedAt: string;
  dataSource: NutritionDataSource;
  confidence: number;
  needsClarification: boolean;
  nutrition: NutritionMacros;
  /** Catalog slug when matched. */
  foodSlug: string | null;
  catalog: ParsedFoodCatalogRef | null;
};

export type ParsedMealDraft = {
  items: ParsedFoodItemDraft[];
  sourceTextLength: number;
};
