import type {
  AiValueSnapshot,
  ParsedFoodItemDraft,
} from "@/lib/domain/nutrition/parse-types";
import type { NutritionMacros } from "@/lib/domain/nutrition/types";

export type CorrectionDiff = {
  field: string;
  beforeValue: string | number | null;
  afterValue: string | number | null;
};

function macroFields(): (keyof NutritionMacros)[] {
  return [
    "energyKcal",
    "proteinG",
    "carbsG",
    "fatG",
    "fibreG",
    "sugarG",
    "sodiumMg",
  ];
}

function valuesEqual(
  a: string | number | null,
  b: string | number | null,
): boolean {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 1e-9;
  }
  return false;
}

/** Diff current draft against AI snapshot for UserCorrection rows (FR-20). */
export function diffAiCorrections(
  item: ParsedFoodItemDraft,
): CorrectionDiff[] {
  if (item.origin !== "ai_parse" || !item.aiSnapshot) return [];
  const snap: AiValueSnapshot = item.aiSnapshot;
  const out: CorrectionDiff[] = [];

  const scalars: Array<{
    field: string;
    before: string | number | null;
    after: string | number | null;
  }> = [
    { field: "name", before: snap.name, after: item.name },
    { field: "quantity", before: snap.quantity, after: item.quantity },
    { field: "unit", before: snap.unit, after: item.unit },
    { field: "mealType", before: snap.mealType, after: item.mealType },
  ];

  for (const s of scalars) {
    if (!valuesEqual(s.before, s.after)) {
      out.push({
        field: s.field,
        beforeValue: s.before,
        afterValue: s.after,
      });
    }
  }

  for (const key of macroFields()) {
    const before = snap.nutrition[key];
    const after = item.nutrition[key];
    if (!valuesEqual(before, after)) {
      out.push({ field: key, beforeValue: before, afterValue: after });
    }
  }

  return out;
}

export function snapshotFromDraft(
  item: Pick<
    ParsedFoodItemDraft,
    "name" | "quantity" | "unit" | "mealType" | "nutrition"
  >,
): AiValueSnapshot {
  return {
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    mealType: item.mealType,
    nutrition: { ...item.nutrition },
  };
}
