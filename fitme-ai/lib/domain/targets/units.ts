/**
 * Unit conversion at the edges (AD-11).
 * Canonical: mass g, length cm, energy kcal, water ml.
 */

import type { PreferredUnits } from "@/lib/domain/targets/bmr";

export type { PreferredUnits };

const LB_PER_KG = 2.2046226218;
const IN_PER_CM = 1 / 2.54;
const ML_PER_FL_OZ = 29.5735295625;
const M_PER_MILE = 1609.344;
export const IN_PER_FOOT = 12;

export function kgToG(kg: number): number {
  return Math.round(kg * 1000);
}

export function gToKg(g: number): number {
  return g / 1000;
}

export function lbToG(lb: number): number {
  return Math.round((lb / LB_PER_KG) * 1000);
}

export function gToLb(g: number): number {
  return gToKg(g) * LB_PER_KG;
}

export function cmToIn(cm: number): number {
  return cm * IN_PER_CM;
}

export function inToCm(inches: number): number {
  return inches / IN_PER_CM;
}

export function mlToFlOz(ml: number): number {
  return ml / ML_PER_FL_OZ;
}

export function flOzToMl(flOz: number): number {
  return flOz * ML_PER_FL_OZ;
}

/** Round for stable display (not for persistence). */
export function roundDisplay(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function displayMass(g: number, units: PreferredUnits): number {
  return units === "imperial" ? roundDisplay(gToLb(g), 1) : roundDisplay(gToKg(g), 1);
}

export function displayHeight(cm: number, units: PreferredUnits): number {
  return units === "imperial" ? roundDisplay(cmToIn(cm), 1) : roundDisplay(cm, 0);
}

export function displayWater(ml: number, units: PreferredUnits): number {
  return units === "imperial" ? roundDisplay(mlToFlOz(ml), 0) : Math.round(ml);
}

export function parseMassToG(value: number, units: PreferredUnits): number {
  return units === "imperial" ? lbToG(value) : kgToG(value);
}

export function parseHeightToCm(value: number, units: PreferredUnits): number {
  return units === "imperial" ? inToCm(value) : value;
}

export function parseWaterToMl(value: number, units: PreferredUnits): number {
  return units === "imperial" ? Math.round(flOzToMl(value)) : Math.round(value);
}

export type FeetInches = { feet: number; inches: number };

/**
 * Split total inches into feet + inches the way people say their height.
 *
 * Rounds to the nearest whole inch first, so 71.6 in reads as 6'0" rather than
 * 5'11.6" — nobody enters a fractional inch, and carrying the rounding after
 * the split would produce a 12" remainder.
 */
export function splitFeetInches(totalInches: number): FeetInches {
  const whole = Math.round(totalInches);
  return {
    feet: Math.floor(whole / IN_PER_FOOT),
    inches: whole % IN_PER_FOOT,
  };
}

export function feetInchesToInches(feet: number, inches: number): number {
  return feet * IN_PER_FOOT + inches;
}

/** Height as feet + inches for imperial; `null` when the user is on metric. */
export function displayHeightParts(
  cm: number,
  units: PreferredUnits,
): FeetInches | null {
  return units === "imperial" ? splitFeetInches(cmToIn(cm)) : null;
}

export function mToKm(m: number): number {
  return m / 1000;
}

export function kmToM(km: number): number {
  return Math.round(km * 1000);
}

export function mToMi(m: number): number {
  return m / M_PER_MILE;
}

export function miToM(mi: number): number {
  return Math.round(mi * M_PER_MILE);
}

export function distanceUnitLabel(units: PreferredUnits): string {
  return units === "imperial" ? "mi" : "km";
}

export function displayDistance(m: number, units: PreferredUnits): number {
  return roundDisplay(units === "imperial" ? mToMi(m) : mToKm(m), 2);
}

export function parseDistanceToM(value: number, units: PreferredUnits): number {
  return units === "imperial" ? miToM(value) : kmToM(value);
}
