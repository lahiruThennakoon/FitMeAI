import type { NutritionMacros } from "@/lib/domain/nutrition/types";

/** Scale per-100g macros to a gram amount. Null stays null. */
export function scalePer100g(
  per100g: NutritionMacros,
  grams: number,
): NutritionMacros {
  if (!Number.isFinite(grams) || grams < 0) {
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
  // 0 g of a known macro contributes 0; unknown macros stay null.
  if (grams === 0) {
    const zeroOrNull = (v: number | null) =>
      v === null || v === undefined ? null : 0;
    return {
      energyKcal: zeroOrNull(per100g.energyKcal),
      proteinG: zeroOrNull(per100g.proteinG),
      carbsG: zeroOrNull(per100g.carbsG),
      fatG: zeroOrNull(per100g.fatG),
      fibreG: zeroOrNull(per100g.fibreG),
      sugarG: zeroOrNull(per100g.sugarG),
      sodiumMg: zeroOrNull(per100g.sodiumMg),
    };
  }
  const f = grams / 100;
  const scale = (v: number | null) =>
    v === null || v === undefined ? null : round1(v * f);
  return {
    energyKcal: scale(per100g.energyKcal),
    proteinG: scale(per100g.proteinG),
    carbsG: scale(per100g.carbsG),
    fatG: scale(per100g.fatG),
    fibreG: scale(per100g.fibreG),
    sugarG: scale(per100g.sugarG),
    sodiumMg: scale(per100g.sodiumMg),
  };
}

/** Sum contributions; if any line is null for a macro, the total for that macro is null. */
export function sumNutrition(parts: NutritionMacros[]): NutritionMacros {
  const keys: (keyof NutritionMacros)[] = [
    "energyKcal",
    "proteinG",
    "carbsG",
    "fatG",
    "fibreG",
    "sugarG",
    "sodiumMg",
  ];
  const out = {} as NutritionMacros;
  for (const key of keys) {
    let total = 0;
    let anyNull = false;
    let anyValue = false;
    for (const part of parts) {
      const v = part[key];
      if (v === null || v === undefined) {
        anyNull = true;
        break;
      }
      anyValue = true;
      total += v;
    }
    out[key] = anyNull || !anyValue ? null : round1(total);
  }
  return out;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
