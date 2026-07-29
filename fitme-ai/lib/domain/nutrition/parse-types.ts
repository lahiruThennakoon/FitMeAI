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

/** Ingredient line for composite bottom-up calc (Story 2.4 / FR-7). */
export type IngredientBreakdownLine = {
  ingredientSlug: string;
  name: string;
  grams: number;
  /** Share of the dish by mass; lines normalize to 100. */
  proportionPct: number;
  contribution: NutritionMacros;
  per100g: NutritionMacros;
  dataSource: NutritionDataSource;
};

/** Immutable AI values for UserCorrection diffs (Story 2.6 / FR-20). */
export type AiValueSnapshot = {
  name: string;
  quantity: number;
  unit: FoodParseUnit;
  mealType: MealType;
  nutrition: NutritionMacros;
};

/** Draft item after AI parse + catalog match (not persisted until confirm). */
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
  /** Present for composite (multi-ingredient) catalog foods. */
  breakdown: IngredientBreakdownLine[] | null;
  kind: "simple" | "composite" | "estimated";
  /** ai_parse drafts capture corrections on save; manual skips. */
  origin: "ai_parse" | "manual";
  /** Original AI values at parse time (ai_parse only). */
  aiSnapshot: AiValueSnapshot | null;
  /**
   * Optional free-text context typed in review. Optional rather than nullable
   * so the many draft builders (parse, decompose, chips, rescale) stay valid.
   */
  note?: string | null;
};

export type ParsedMealDraft = {
  items: ParsedFoodItemDraft[];
  sourceTextLength: number;
  /** Audit row from the parse call (Story 2.10 / FR-19). */
  aiInteractionId: string | null;
};
