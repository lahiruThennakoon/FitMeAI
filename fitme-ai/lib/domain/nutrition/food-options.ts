import type { FoodParseUnit, MealType } from "@/lib/domain/nutrition/parse-types";

/** Portion units offered wherever a food quantity is edited. */
export const FOOD_PARSE_UNITS: readonly FoodParseUnit[] = [
  "g",
  "piece",
  "cup",
  "tablespoon",
  "bowl",
  "plate",
  "serving",
];

/** Meal slots offered wherever a meal type is edited. */
export const MEAL_TYPE_OPTIONS: readonly (readonly [MealType, string])[] = [
  ["breakfast", "Breakfast"],
  ["lunch", "Lunch"],
  ["dinner", "Dinner"],
  ["snack", "Snack"],
  ["unknown", "Not sure"],
];

export function coerceFoodParseUnit(raw: string): FoodParseUnit {
  const normalized = raw.trim().toLowerCase();
  if ((FOOD_PARSE_UNITS as readonly string[]).includes(normalized)) {
    return normalized as FoodParseUnit;
  }
  return "serving";
}

export function mealTypeLabel(mealType: MealType): string {
  return MEAL_TYPE_OPTIONS.find(([value]) => value === mealType)?.[1] ?? "Not sure";
}
