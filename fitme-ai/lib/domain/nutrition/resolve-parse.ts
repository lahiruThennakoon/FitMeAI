import type { FoodParseAiInput } from "@/lib/ai/schemas/food-parse";
import { CLARIFYING_CONFIDENCE_THRESHOLD } from "@/lib/domain/nutrition/clarifying-chips";
import {
  buildCatalogDraft,
  buildEstimatedDraft,
} from "@/lib/domain/nutrition/estimate-fallback";
import { portionGramsFromCatalog } from "@/lib/domain/nutrition/draft-recompute";
import type {
  FoodParseUnit,
  MealType,
  ParsedFoodItemDraft,
  ParsedMealDraft,
} from "@/lib/domain/nutrition/parse-types";
import type { FoodDetailDto } from "@/lib/domain/nutrition/types";

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

export async function lookupFoodByName(
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
 * Merge AI parse items with nutrition catalog lookups (FR-6 / FR-11).
 * Matched foods → dataSource database; unmatched → ai_estimated.
 * Catalog match is always preferred over estimate when found.
 */
export async function resolveParsedMeal(
  ai: FoodParseAiInput,
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
    const food = await lookupFoodByName(raw.name, deps.findFoodBySlugOrAlias);
    const mealType = raw.mealType ?? fallbackMeal;
    const identity = {
      id: idFactory(),
      quantity: raw.quantity,
      unit: raw.unit,
      mealType,
      loggedAt,
      confidence: raw.confidence,
      origin: "ai_parse" as const,
      aiSnapshot: null,
    };

    if (food) {
      items.push(
        buildCatalogDraft(food, identity, {
          needsClarification:
            raw.needsClarification === true ||
            raw.confidence < CLARIFYING_CONFIDENCE_THRESHOLD ||
            !unitSupportedByFood(raw.unit, food),
        }),
      );
      continue;
    }

    items.push(
      buildEstimatedDraft(raw.name, identity, raw.estimate, {
        needsClarification: raw.needsClarification,
      }),
    );
  }

  return { items, sourceTextLength };
}
