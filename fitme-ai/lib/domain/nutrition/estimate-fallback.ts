import { CLARIFYING_CONFIDENCE_THRESHOLD } from "@/lib/domain/nutrition/clarifying-chips";
import { snapshotFromDraft } from "@/lib/domain/nutrition/corrections";
import { decomposeFoodPortion } from "@/lib/domain/nutrition/decompose";
import { portionGramsFromCatalog } from "@/lib/domain/nutrition/draft-recompute";
import { scaleMacros } from "@/lib/domain/nutrition/scale";
import type {
  FoodParseUnit,
  MealType,
  ParsedFoodItemDraft,
} from "@/lib/domain/nutrition/parse-types";
import type {
  FoodDetailDto,
  NutritionMacros,
} from "@/lib/domain/nutrition/types";

const EMPTY_MACROS: NutritionMacros = {
  energyKcal: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  fibreG: null,
  sugarG: null,
  sodiumMg: null,
};

export type AiEstimateMacros = {
  energyKcal?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  fibreG?: number | null;
  sugarG?: number | null;
  sodiumMg?: number | null;
};

/** Map AI estimate → draft nutrition (FR-11). Negligible fibre/sugar default to 0. */
export function nutritionFromAiEstimate(
  estimate: AiEstimateMacros | null | undefined,
): NutritionMacros {
  if (!estimate) return { ...EMPTY_MACROS };
  return {
    energyKcal: estimate.energyKcal ?? null,
    proteinG: estimate.proteinG ?? null,
    carbsG: estimate.carbsG ?? null,
    fatG: estimate.fatG ?? null,
    fibreG: estimate.fibreG ?? 0,
    sugarG: estimate.sugarG ?? 0,
    sodiumMg: estimate.sodiumMg ?? null,
  };
}

export function needsEstimateReview(confidence: number, flagged?: boolean): boolean {
  return flagged === true || confidence < CLARIFYING_CONFIDENCE_THRESHOLD;
}

type DraftIdentity = {
  id: string;
  quantity: number;
  unit: FoodParseUnit;
  mealType: MealType;
  loggedAt: string;
  confidence: number;
  origin: ParsedFoodItemDraft["origin"];
  /** Preserve AI snapshot across rematch when present. */
  aiSnapshot: ParsedFoodItemDraft["aiSnapshot"];
};

/**
 * Unknown / unmatched food → ai_estimated draft (FR-11).
 * Never claims database provenance.
 */
export function buildEstimatedDraft(
  name: string,
  identity: DraftIdentity,
  estimate: AiEstimateMacros | null | undefined,
  opts?: { needsClarification?: boolean },
): ParsedFoodItemDraft {
  const nutrition = nutritionFromAiEstimate(estimate);
  const draft: ParsedFoodItemDraft = {
    id: identity.id,
    name,
    quantity: identity.quantity,
    unit: identity.unit,
    mealType: identity.mealType,
    loggedAt: identity.loggedAt,
    dataSource: "ai_estimated",
    confidence: identity.confidence,
    needsClarification: needsEstimateReview(
      identity.confidence,
      opts?.needsClarification,
    ),
    nutrition,
    foodSlug: null,
    catalog: null,
    breakdown: null,
    kind: "estimated",
    origin: identity.origin,
    aiSnapshot: identity.aiSnapshot,
  };
  if (identity.origin === "ai_parse" && !draft.aiSnapshot) {
    draft.aiSnapshot = snapshotFromDraft(draft);
  }
  return draft;
}

/**
 * Catalog hit → database draft. Preferred over estimate when a match exists (FR-11).
 */
export function buildCatalogDraft(
  food: FoodDetailDto,
  identity: DraftIdentity & { name?: string },
  opts?: { needsClarification?: boolean },
): ParsedFoodItemDraft {
  const portion = portionGramsFromCatalog(identity.quantity, identity.unit, {
    defaultServingG: food.defaultServingG,
    nutritionAtDefault: food.nutrition,
    servings: food.servings,
  });
  const factor = portion.grams / food.defaultServingG;
  const decomposed = decomposeFoodPortion(food, portion.grams);
  const nutrition =
    decomposed?.nutrition ?? scaleMacros(food.nutrition, factor);

  const draft: ParsedFoodItemDraft = {
    id: identity.id,
    name: identity.name ?? food.name,
    quantity: identity.quantity,
    unit: identity.unit,
    mealType: identity.mealType,
    loggedAt: identity.loggedAt,
    dataSource: "database",
    confidence: identity.confidence,
    needsClarification:
      opts?.needsClarification === true ||
      !portion.unitMatched ||
      needsEstimateReview(identity.confidence),
    nutrition,
    foodSlug: food.slug,
    catalog: {
      defaultServingG: food.defaultServingG,
      nutritionAtDefault: food.nutrition,
      servings: food.servings,
    },
    breakdown: decomposed?.breakdown ?? null,
    kind: food.kind,
    origin: identity.origin,
    aiSnapshot: identity.aiSnapshot,
  };
  if (identity.origin === "ai_parse" && !draft.aiSnapshot) {
    draft.aiSnapshot = snapshotFromDraft(draft);
  }
  return draft;
}

/** True when a draft must not be labeled as database-sourced. */
export function isAiEstimatedDraft(item: ParsedFoodItemDraft): boolean {
  return item.dataSource === "ai_estimated" || item.kind === "estimated";
}
