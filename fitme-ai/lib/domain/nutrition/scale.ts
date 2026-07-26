import type { NutritionMacros } from "@/lib/domain/nutrition/types";

/** Scale all macros by a factor. Null stays null. */
export function scaleMacros(
  macros: NutritionMacros,
  factor: number,
): NutritionMacros {
  if (!Number.isFinite(factor) || factor <= 0) {
    return {
      energyKcal: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      fibreG: null,
      sugarG: null,
      sodiumMg: null,
    };
  }
  const scale = (v: number | null) =>
    v === null || v === undefined ? null : Math.round(v * factor * 10) / 10;
  return {
    energyKcal: scale(macros.energyKcal),
    proteinG: scale(macros.proteinG),
    carbsG: scale(macros.carbsG),
    fatG: scale(macros.fatG),
    fibreG: scale(macros.fibreG),
    sugarG: scale(macros.sugarG),
    sodiumMg: scale(macros.sodiumMg),
  };
}
