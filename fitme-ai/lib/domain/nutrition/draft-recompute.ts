import { scaleMacros } from "@/lib/domain/nutrition/scale";
import type {
  FoodParseUnit,
  ParsedFoodCatalogRef,
  ParsedFoodItemDraft,
} from "@/lib/domain/nutrition/parse-types";

export function portionGramsFromCatalog(
  quantity: number,
  unit: FoodParseUnit,
  catalog: ParsedFoodCatalogRef,
): { grams: number; unitMatched: boolean } {
  if (unit === "g") return { grams: quantity, unitMatched: true };

  const serving = catalog.servings.find(
    (s) => s.name.toLowerCase() === unit || s.name.toLowerCase().includes(unit),
  );
  if (serving) return { grams: serving.grams * quantity, unitMatched: true };

  return {
    grams: catalog.defaultServingG * quantity,
    unitMatched: false,
  };
}

/** Rescale database-backed draft nutrition after quantity/unit edits. */
export function recomputeDraftNutrition(
  item: ParsedFoodItemDraft,
): ParsedFoodItemDraft {
  if (!item.catalog || item.dataSource !== "database") return item;

  const { grams, unitMatched } = portionGramsFromCatalog(
    item.quantity,
    item.unit,
    item.catalog,
  );
  const factor = grams / item.catalog.defaultServingG;
  return {
    ...item,
    nutrition: scaleMacros(item.catalog.nutritionAtDefault, factor),
    needsClarification: item.needsClarification || !unitMatched,
  };
}
