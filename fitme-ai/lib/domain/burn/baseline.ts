/**
 * Auto Baseline Burn from profile (Story 3.1 / FR-13).
 * Baseline Burn = TDEE = BMR × activity multiplier (no exercise entries).
 */

import {
  ACTIVITY_MULTIPLIERS,
  MIFFLIN_ST_JEOR_FORMULA,
  computeBmr,
  computeTdee,
  type ActivityLevel,
  type Sex,
} from "@/lib/domain/targets/bmr";
import { gToKg } from "@/lib/domain/targets/units";

/** Conservative default when activity level is missing (FR-13 edge). */
export const DEFAULT_ACTIVITY_LEVEL: ActivityLevel = "sedentary";

export const BASELINE_BURN_LIMITATION =
  "These are estimates, not medical advice. Baseline Burn is an approximation of daily energy use from your profile — not a clinical measurement.";

export type BaselineBurnProfileInput = {
  weightG: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
  /** Missing/invalid → sedentary with a note. */
  activityLevel?: ActivityLevel | null;
};

export type BaselineBurnResult = {
  bmrKcal: number;
  /** TDEE used as daily Baseline Burn (kcal/day). */
  baselineBurnKcal: number;
  activityLevel: ActivityLevel;
  activityMultiplier: number;
  usedDefaultActivity: boolean;
  formulaBmr: string;
  formulaTdee: string;
  limitation: string;
};

const ACTIVITY_SET = new Set<string>(Object.keys(ACTIVITY_MULTIPLIERS));

export function resolveActivityLevel(
  activityLevel?: ActivityLevel | null,
): { activityLevel: ActivityLevel; usedDefault: boolean } {
  if (activityLevel && ACTIVITY_SET.has(activityLevel)) {
    return { activityLevel, usedDefault: false };
  }
  return { activityLevel: DEFAULT_ACTIVITY_LEVEL, usedDefault: true };
}

/**
 * Compute Baseline Burn from canonical profile units (g, cm).
 * Recomputes from live profile inputs (not a cached goal snapshot).
 */
export function computeBaselineBurn(
  profile: BaselineBurnProfileInput,
): BaselineBurnResult {
  const { activityLevel, usedDefault } = resolveActivityLevel(
    profile.activityLevel,
  );
  const weightKg = gToKg(profile.weightG);
  const bmrKcal = computeBmr({
    weightKg,
    heightCm: profile.heightCm,
    ageYears: profile.ageYears,
    sex: profile.sex,
  });
  const baselineBurnKcal = computeTdee(bmrKcal, activityLevel);

  return {
    bmrKcal,
    baselineBurnKcal,
    activityLevel,
    activityMultiplier: ACTIVITY_MULTIPLIERS[activityLevel],
    usedDefaultActivity: usedDefault,
    formulaBmr: MIFFLIN_ST_JEOR_FORMULA[profile.sex],
    formulaTdee: MIFFLIN_ST_JEOR_FORMULA.tdee,
    limitation: BASELINE_BURN_LIMITATION,
  };
}

export type NetCaloriesInput = {
  intakeKcal: number;
  baselineBurnKcal: number;
  /** Manual exercise burn; defaults to 0 (Story 3.1 — net works with no exercise). */
  exerciseKcal?: number;
};

/**
 * Net = calories in − (Baseline Burn + exercise).
 * Positive → surplus; negative → deficit.
 */
export function computeNetCalories(input: NetCaloriesInput): number {
  const exercise = input.exerciseKcal ?? 0;
  return Math.round(
    input.intakeKcal - (input.baselineBurnKcal + exercise),
  );
}
