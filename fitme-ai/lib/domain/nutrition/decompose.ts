import { scalePer100g, sumNutrition } from "@/lib/domain/nutrition/compose";
import type {
  IngredientBreakdownLine,
  ParsedFoodItemDraft,
} from "@/lib/domain/nutrition/parse-types";
import type { FoodDetailDto, NutritionMacros } from "@/lib/domain/nutrition/types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundPct(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Normalize proportion percentages to sum to 100 (within 0.1). */
export function normalizeProportions(pcts: number[]): number[] {
  if (pcts.length === 0) return [];
  const clamped = pcts.map((p) => (Number.isFinite(p) && p > 0 ? p : 0));
  const sum = clamped.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const even = roundPct(100 / pcts.length);
    const out = pcts.map(() => even);
    out[out.length - 1] = roundPct(100 - even * (out.length - 1));
    return out;
  }
  const scaled = clamped.map((p) => (p / sum) * 100);
  const rounded = scaled.map((p) => roundPct(p));
  const drift = roundPct(100 - rounded.reduce((a, b) => a + b, 0));
  rounded[rounded.length - 1] = roundPct(rounded[rounded.length - 1] + drift);
  return rounded;
}

function linesFromScaledRecipe(
  food: FoodDetailDto,
  portionGrams: number,
): IngredientBreakdownLine[] {
  if (food.ingredients.length === 0 || food.defaultServingG <= 0) return [];
  const factor = portionGrams / food.defaultServingG;
  const rawGrams = food.ingredients.map((line) =>
    Math.max(0, line.grams * factor),
  );
  const totalG = rawGrams.reduce((a, b) => a + b, 0);
  if (totalG <= 0) return [];

  const pcts = normalizeProportions(
    rawGrams.map((g) => (g / totalG) * 100),
  );

  return food.ingredients.map((line, i) => {
    const grams = round1((pcts[i] / 100) * totalG);
    const per100g = line.ingredient.per100g;
    const contribution = scalePer100g(per100g, grams);
    return {
      ingredientSlug: line.ingredient.slug,
      name: line.ingredient.name,
      grams,
      proportionPct: pcts[i],
      contribution,
      per100g,
      dataSource: "database" as const,
    };
  });
}

/** Build ingredient breakdown for a portion; totals = sum of contributions. */
export function decomposeFoodPortion(
  food: FoodDetailDto,
  portionGrams: number,
): { breakdown: IngredientBreakdownLine[]; nutrition: NutritionMacros } | null {
  if (food.kind !== "composite" && food.ingredients.length <= 1) {
    return null;
  }
  const breakdown = linesFromScaledRecipe(food, portionGrams);
  if (breakdown.length === 0) return null;
  return {
    breakdown,
    nutrition: sumNutrition(breakdown.map((l) => l.contribution)),
  };
}

export function totalBreakdownGrams(lines: IngredientBreakdownLine[]): number {
  return round1(lines.reduce((a, l) => a + l.grams, 0));
}

/** Rescale an existing breakdown to a new total gram amount (keep proportions). */
export function rescaleBreakdown(
  lines: IngredientBreakdownLine[],
  newTotalGrams: number,
): IngredientBreakdownLine[] {
  if (lines.length === 0 || newTotalGrams <= 0) return lines;
  const pcts = normalizeProportions(lines.map((l) => l.proportionPct));
  return lines.map((line, i) => {
    const grams = round1((pcts[i] / 100) * newTotalGrams);
    const contribution = scalePer100g(line.per100g, grams);
    return {
      ...line,
      grams,
      proportionPct: pcts[i],
      contribution,
    };
  });
}

function redistributeRemaining(
  others: IngredientBreakdownLine[],
  remaining: number,
): number[] {
  if (others.length === 0) return [];
  if (remaining <= 0) return others.map(() => 0);

  const otherSum = others.reduce((a, l) => a + l.proportionPct, 0);
  const raw =
    otherSum <= 0
      ? others.map(() => remaining / others.length)
      : others.map((l) => (l.proportionPct / otherSum) * remaining);

  const rounded = raw.map((p) => roundPct(p));
  const drift = roundPct(remaining - rounded.reduce((a, b) => a + b, 0));
  rounded[rounded.length - 1] = roundPct(rounded[rounded.length - 1] + drift);
  return rounded;
}

/**
 * Edit one ingredient's proportion; pin that value and rebalance the rest
 * to 100%, then recompute contributions + parent nutrition.
 */
export function applyProportionEdit(
  item: ParsedFoodItemDraft,
  ingredientSlug: string,
  newPct: number,
): ParsedFoodItemDraft {
  if (!item.breakdown || item.breakdown.length === 0) return item;
  const totalG = totalBreakdownGrams(item.breakdown);
  const pinned = Math.max(
    0,
    Math.min(100, Number.isFinite(newPct) ? newPct : 0),
  );
  const idx = item.breakdown.findIndex(
    (l) => l.ingredientSlug === ingredientSlug,
  );
  if (idx < 0) return item;

  if (item.breakdown.length === 1) {
    const grams = totalG;
    const line = item.breakdown[0];
    const breakdown = [
      {
        ...line,
        grams,
        proportionPct: 100,
        contribution: scalePer100g(line.per100g, grams),
      },
    ];
    return {
      ...item,
      breakdown,
      nutrition: sumNutrition(breakdown.map((l) => l.contribution)),
    };
  }

  const others = item.breakdown.filter((_, i) => i !== idx);
  const otherPcts = redistributeRemaining(others, roundPct(100 - pinned));

  let otherI = 0;
  const breakdown = item.breakdown.map((line, i) => {
    const proportionPct = i === idx ? roundPct(pinned) : otherPcts[otherI++];
    const grams = round1((proportionPct / 100) * totalG);
    return {
      ...line,
      grams,
      proportionPct,
      contribution: scalePer100g(line.per100g, grams),
    };
  });
  return {
    ...item,
    breakdown,
    nutrition: sumNutrition(breakdown.map((l) => l.contribution)),
  };
}

/** After qty/unit change: rebuild nutrition from breakdown when present. */
export function recomputeFromBreakdown(
  item: ParsedFoodItemDraft,
  portionGrams: number,
): ParsedFoodItemDraft {
  if (!item.breakdown || item.breakdown.length === 0) return item;
  const breakdown = rescaleBreakdown(item.breakdown, portionGrams);
  return {
    ...item,
    breakdown,
    nutrition: sumNutrition(breakdown.map((l) => l.contribution)),
  };
}
