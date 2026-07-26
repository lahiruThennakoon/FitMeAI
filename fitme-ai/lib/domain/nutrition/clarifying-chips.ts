import { recomputeDraftNutrition } from "@/lib/domain/nutrition/draft-recompute";
import { scaleMacros } from "@/lib/domain/nutrition/scale";
import type {
  FoodParseUnit,
  ParsedFoodItemDraft,
} from "@/lib/domain/nutrition/parse-types";

/** Below this confidence (or explicit needsClarification) → chips may appear (FR-8). */
export const CLARIFYING_CONFIDENCE_THRESHOLD = 0.7;

/** Max clarifying chip *groups* shown per meal log (SM-1 / FR-8). */
export const MAX_CLARIFYING_CHIP_GROUPS = 3;

/** Max tappable options inside one chip group. */
export const MAX_CHIP_OPTIONS = 3;

export type ClarifyingChipOption = {
  id: string;
  label: string;
  quantity: number;
  unit: FoodParseUnit;
};

export type ClarifyingChipGroup = {
  itemId: string;
  attribute: "portion";
  prompt: string;
  options: ClarifyingChipOption[];
};

export function itemNeedsClarifyingChips(item: ParsedFoodItemDraft): boolean {
  return (
    item.needsClarification === true ||
    item.confidence < CLARIFYING_CONFIDENCE_THRESHOLD
  );
}

function roundQty(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Build 1–3 portion options. Prefer catalog servings named small/medium/large
 * (or first three servings); else relative multipliers on current quantity.
 */
export function buildPortionChipOptions(
  item: ParsedFoodItemDraft,
): ClarifyingChipOption[] {
  const servings = item.catalog?.servings ?? [];
  const preferred = ["small", "medium", "large"] as const;

  const named: ClarifyingChipOption[] = [];
  for (const label of preferred) {
    const serving = servings.find((s) =>
      s.name.toLowerCase().includes(label),
    );
    if (!serving) continue;
    named.push({
      id: `serving:${serving.name}`,
      label: label[0]!.toUpperCase() + label.slice(1),
      quantity: serving.grams,
      unit: "g",
    });
  }

  if (named.length >= 2) {
    return named.slice(0, MAX_CHIP_OPTIONS);
  }

  if (servings.length > 0) {
    return servings.slice(0, MAX_CHIP_OPTIONS).map((s) => ({
      id: `serving:${s.name}`,
      label: s.name,
      quantity: s.grams,
      unit: "g" as const,
    }));
  }

  const q = item.quantity > 0 ? item.quantity : 1;
  const unit = item.unit;
  return [
    {
      id: "mult:small",
      label: "Small",
      quantity: roundQty(q * 0.67),
      unit,
    },
    {
      id: "mult:medium",
      label: "Medium",
      quantity: roundQty(q),
      unit,
    },
    {
      id: "mult:large",
      label: "Large",
      quantity: roundQty(q * 1.5),
      unit,
    },
  ].slice(0, MAX_CHIP_OPTIONS);
}

/**
 * Select up to MAX_CLARIFYING_CHIP_GROUPS groups for uncertain items
 * (lowest confidence first). Confident meals → [].
 */
export function selectClarifyingChipGroups(
  items: ParsedFoodItemDraft[],
  maxGroups: number = MAX_CLARIFYING_CHIP_GROUPS,
): ClarifyingChipGroup[] {
  const cap = Math.max(0, Math.min(MAX_CLARIFYING_CHIP_GROUPS, maxGroups));
  const candidates = items
    .filter(itemNeedsClarifyingChips)
    .slice()
    .sort((a, b) => a.confidence - b.confidence || a.name.localeCompare(b.name));

  return candidates.slice(0, cap).map((item) => ({
    itemId: item.id,
    attribute: "portion" as const,
    prompt: `${item.name} portion?`,
    options: buildPortionChipOptions(item),
  }));
}

/** Apply a portion chip: update qty/unit, recompute nutrition, clear clarification. */
export function applyClarifyingChip(
  item: ParsedFoodItemDraft,
  option: ClarifyingChipOption,
): ParsedFoodItemDraft {
  const cleared = {
    ...item,
    quantity: option.quantity,
    unit: option.unit,
    needsClarification: false,
    confidence: Math.max(item.confidence, CLARIFYING_CONFIDENCE_THRESHOLD),
  };

  if (item.catalog && item.dataSource === "database") {
    return recomputeDraftNutrition(cleared);
  }

  // Estimated / unmatched: scale current macros by quantity ratio (same unit family).
  const prevQty = item.quantity > 0 ? item.quantity : 1;
  const factor = option.quantity / prevQty;
  return {
    ...cleared,
    nutrition: scaleMacros(item.nutrition, factor),
  };
}
