import type {
  MealType,
  ParsedFoodCatalogRef,
  ParsedFoodItemDraft,
} from "@/lib/domain/nutrition/parse-types";
import type {
  NutritionDataSource,
  NutritionMacros,
} from "@/lib/domain/nutrition/types";
import { coerceFoodParseUnit } from "@/lib/domain/nutrition/food-options";

export { coerceFoodParseUnit };

export type FoodEntryDraftSource = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  mealType: MealType;
  dataSource: NutritionDataSource;
  confidence: number | null;
  energyKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fibreG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  foodSlug: string | null;
};

function macrosFromEntry(row: FoodEntryDraftSource): NutritionMacros {
  return {
    energyKcal: row.energyKcal,
    proteinG: row.proteinG,
    carbsG: row.carbsG,
    fatG: row.fatG,
    fibreG: row.fibreG,
    sugarG: row.sugarG,
    sodiumMg: row.sodiumMg,
  };
}

/** Build an editable draft from a saved food entry (Story 5.5 edit-first re-log). */
export function foodEntryToDraft(
  row: FoodEntryDraftSource,
  opts?: {
    catalog?: ParsedFoodCatalogRef | null;
    foodSlug?: string | null;
    kind?: ParsedFoodItemDraft["kind"];
  },
): ParsedFoodItemDraft {
  const catalog = opts?.catalog ?? null;
  const foodSlug = opts?.foodSlug ?? row.foodSlug;
  const kind =
    opts?.kind ??
    (row.dataSource === "database" && foodSlug ? "simple" : "estimated");
  return {
    id: `template_${row.id}_${Date.now()}`,
    name: row.name,
    quantity: row.quantity,
    unit: coerceFoodParseUnit(row.unit),
    mealType: row.mealType,
    loggedAt: new Date().toISOString(),
    dataSource: row.dataSource,
    confidence: row.confidence ?? 1,
    needsClarification: false,
    nutrition: macrosFromEntry(row),
    foodSlug,
    catalog,
    breakdown: null,
    kind,
    origin: "manual",
    aiSnapshot: null,
  };
}

/** Offline/minimal draft when only list chip fields are available. */
export function foodTemplateChipToDraft(input: {
  sourceEntryId: string;
  name: string;
  quantity: number;
  unit: string;
  mealType: MealType;
  energyKcal: number | null;
  dataSource: NutritionDataSource;
  foodSlug: string | null;
}): ParsedFoodItemDraft {
  return foodEntryToDraft({
    id: input.sourceEntryId,
    name: input.name,
    quantity: input.quantity,
    unit: input.unit,
    mealType: input.mealType,
    dataSource: input.dataSource,
    confidence: 1,
    energyKcal: input.energyKcal,
    proteinG: null,
    carbsG: null,
    fatG: null,
    fibreG: null,
    sugarG: null,
    sodiumMg: null,
    foodSlug: input.foodSlug,
  });
}
