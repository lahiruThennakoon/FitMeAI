import type { FoodParseAiOutput } from "@/lib/ai/schemas/food-parse";
import { CLARIFYING_CONFIDENCE_THRESHOLD } from "@/lib/domain/nutrition/clarifying-chips";
import { decomposeFoodPortion } from "@/lib/domain/nutrition/decompose";
import { portionGramsFromCatalog } from "@/lib/domain/nutrition/draft-recompute";
import { scaleMacros } from "@/lib/domain/nutrition/scale";
import type {
  FoodParseUnit,
  MealType,
  ParsedFoodItemDraft,
  ParsedMealDraft,
} from "@/lib/domain/nutrition/parse-types";
import type { FoodDetailDto } from "@/lib/domain/nutrition/types";

const EMPTY_MACROS = {
  energyKcal: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  fibreG: null,
  sugarG: null,
  sodiumMg: null,
};

export type ResolveParseDeps = {
  findFoodBySlugOrAlias: (query: string) => Promise<FoodDetailDto | null>;
  now?: () => Date;
  idFactory?: () => string;
};

/** Map unit/quantity onto catalog default serving grams. */
export function resolvePortionGrams(
  quantity: number,
  unit: FoodParseUnit,
  food: FoodDetailDto,
): number {
  return portionGramsFromCatalog(quantity, unit, {
    defaultServingG: food.defaultServingG,
    nutritionAtDefault: food.nutrition,
    servings: food.servings,
  }).grams;
}

export function unitSupportedByFood(
  unit: FoodParseUnit,
  food: FoodDetailDto,
): boolean {
  return portionGramsFromCatalog(1, unit, {
    defaultServingG: food.defaultServingG,
    nutritionAtDefault: food.nutrition,
    servings: food.servings,
  }).unitMatched;
}

function defaultMealType(now: Date): MealType {
  const hour = now.getHours();
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

/** Candidate lookup strings from a noisy AI food name. */
export function foodLookupQueries(name: string): string[] {
  const trimmed = name.trim().toLowerCase();
  const withoutCount = trimmed
    .replace(/^(one|two|three|four|five|a|an|\d+)\s+/i, "")
    .trim();
  const singular =
    withoutCount.endsWith("s") && withoutCount.length > 3
      ? withoutCount.slice(0, -1)
      : withoutCount;
  return [...new Set([trimmed, withoutCount, singular].filter(Boolean))];
}

async function lookupFood(
  name: string,
  findFood: ResolveParseDeps["findFoodBySlugOrAlias"],
): Promise<FoodDetailDto | null> {
  for (const q of foodLookupQueries(name)) {
    const hit = await findFood(q);
    if (hit) return hit;
  }
  return null;
}

/**
 * Merge AI parse items with nutrition catalog lookups (FR-6).
 * Matched foods → dataSource database; unmatched → ai_estimated (estimate or nulls).
 */
export async function resolveParsedMeal(
  ai: FoodParseAiOutput,
  sourceTextLength: number,
  deps: ResolveParseDeps,
): Promise<ParsedMealDraft> {
  const now = deps.now?.() ?? new Date();
  const idFactory =
    deps.idFactory ??
    (() => `draft_${Math.random().toString(36).slice(2, 10)}`);
  const fallbackMeal = ai.inferredMealType ?? defaultMealType(now);
  const loggedAt = now.toISOString();

  const items: ParsedFoodItemDraft[] = [];

  for (const raw of ai.items) {
    const food = await lookupFood(raw.name, deps.findFoodBySlugOrAlias);
    const mealType = raw.mealType ?? fallbackMeal;
    let needsClarification =
      raw.needsClarification === true ||
      raw.confidence < CLARIFYING_CONFIDENCE_THRESHOLD;

    if (food) {
      if (!unitSupportedByFood(raw.unit, food)) {
        needsClarification = true;
      }
      const grams = resolvePortionGrams(raw.quantity, raw.unit, food);
      const factor = grams / food.defaultServingG;
      const decomposed = decomposeFoodPortion(food, grams);
      const nutrition =
        decomposed?.nutrition ?? scaleMacros(food.nutrition, factor);
      items.push({
        id: idFactory(),
        name: food.name,
        quantity: raw.quantity,
        unit: raw.unit,
        mealType,
        loggedAt,
        dataSource: "database",
        confidence: raw.confidence,
        needsClarification,
        nutrition,
        foodSlug: food.slug,
        catalog: {
          defaultServingG: food.defaultServingG,
          nutritionAtDefault: food.nutrition,
          servings: food.servings,
        },
        breakdown: decomposed?.breakdown ?? null,
        kind: food.kind,
      });
      continue;
    }

    items.push({
      id: idFactory(),
      name: raw.name,
      quantity: raw.quantity,
      unit: raw.unit,
      mealType,
      loggedAt,
      dataSource: "ai_estimated",
      confidence: raw.confidence,
      needsClarification,
      nutrition: raw.estimate
        ? {
            energyKcal: raw.estimate.energyKcal,
            proteinG: raw.estimate.proteinG,
            carbsG: raw.estimate.carbsG,
            fatG: raw.estimate.fatG,
            fibreG: raw.estimate.fibreG,
            sugarG: raw.estimate.sugarG,
            sodiumMg: raw.estimate.sodiumMg,
          }
        : { ...EMPTY_MACROS },
      foodSlug: null,
      catalog: null,
      breakdown: null,
      kind: "estimated",
    });
  }

  return { items, sourceTextLength };
}
