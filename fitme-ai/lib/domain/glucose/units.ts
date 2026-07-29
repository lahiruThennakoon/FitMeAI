/** Glucose unit conversion at edges (Epic 8 / AD-11). Canonical storage: mg/dL. */

import {
  FUTURE_TIME_MESSAGE,
  LOG_TIME_SKEW_MS,
  isFutureInstant,
} from "@/lib/domain/log-time";

export const MGDL_PER_MMOL = 18.0182;

export type GlucoseDisplayUnit = "mg_dl" | "mmol_l";

export function mgDlFromDisplay(value: number, unit: GlucoseDisplayUnit): number {
  if (unit === "mmol_l") return value * MGDL_PER_MMOL;
  return value;
}

export function displayFromMgDl(
  valueMgDl: number,
  unit: GlucoseDisplayUnit,
): number {
  if (unit === "mmol_l") return valueMgDl / MGDL_PER_MMOL;
  return valueMgDl;
}

export function glucoseUnitLabel(unit: GlucoseDisplayUnit): string {
  return unit === "mmol_l" ? "mmol/L" : "mg/dL";
}

/**
 * Plausible human range in canonical mg/dL — well outside survivable readings on
 * both ends, so it only catches typos and unit mix-ups.
 */
export const GLUCOSE_MIN_MGDL = 20;
export const GLUCOSE_MAX_MGDL = 800;

export const GLUCOSE_RANGE_MESSAGE =
  "That reading looks out of range — check the value and unit.";

export function isGlucoseInRange(
  value: number,
  unit: GlucoseDisplayUnit,
): boolean {
  const mgDl = mgDlFromDisplay(value, unit);
  return mgDl >= GLUCOSE_MIN_MGDL && mgDl <= GLUCOSE_MAX_MGDL;
}

export const GLUCOSE_FUTURE_MESSAGE = "Readings can't be in the future.";

export { FUTURE_TIME_MESSAGE, LOG_TIME_SKEW_MS as GLUCOSE_FUTURE_SKEW_MS };

export const isFutureMeasurement = isFutureInstant;
