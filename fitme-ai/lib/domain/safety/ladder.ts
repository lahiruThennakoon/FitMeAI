import type { Sex } from "@/lib/domain/targets/bmr";
import { gToKg } from "@/lib/domain/targets/units";

/**
 * Safety ladder (Story 1.7 / FR-5).
 *
 * Cited public-health defaults (shown in-app):
 * - Calorie floors ≈ 1,200 kcal/day (women) / 1,500 kcal/day (men)
 *   — widely used clinical/public-health planning floors (e.g. NHS-style
 *   weight-management guidance; not a personal prescription).
 * - BMI underweight < 18.5 (WHO adult BMI classification) — red regardless of goal.
 * - Max ~1% of current bodyweight per week for intentional change
 *   (conservative rate often cited in clinical weight-management practice).
 *
 * These are estimates for product safety UX, not medical advice.
 */

export type SafetyLevel = "green" | "yellow" | "red";

export type SafetyReasonCode =
  | "calories_below_floor"
  | "calories_aggressive_deficit"
  | "bmi_underweight"
  | "bmi_near_underweight_with_loss"
  | "weekly_change_over_1pct"
  | "weekly_change_aggressive";

export type SafetyAssessment = {
  level: SafetyLevel;
  reasons: SafetyReasonCode[];
  /** Human-readable, supportive copy (no medical advice / no supplements). */
  messages: string[];
  citations: string[];
  /** True when level === "red" — save requires explicit consent. */
  requiresConsent: boolean;
};

export const CALORIE_FLOOR_KCAL: Record<Sex, number> = {
  female: 1200,
  male: 1500,
};

/** WHO adult BMI underweight threshold. */
export const BMI_UNDERWEIGHT = 18.5;

/** Soft band above underweight used for yellow "not recommended". */
export const BMI_NEAR_UNDERWEIGHT = 19.5;

/** Red: weekly |change| > 1% of current bodyweight. */
export const WEEKLY_CHANGE_RED_FRACTION = 0.01;

/** Yellow: weekly |change| > 0.5% of current bodyweight (but ≤ 1%). */
export const WEEKLY_CHANGE_YELLOW_FRACTION = 0.005;

/** Yellow: calories below this fraction of TDEE while still above the hard floor. */
export const AGGRESSIVE_DEFICIT_FRACTION = 0.8;

export const SAFETY_CITATIONS = [
  "Calorie floors ~1,200 kcal/day (women) / ~1,500 kcal/day (men): common public-health planning floors used in weight-management guidance (e.g. NHS-style materials).",
  "BMI < 18.5: WHO adult BMI classification (underweight).",
  "Weekly change ~1% of bodyweight: conservative clinical rate often cited for intentional weight change.",
] as const;

export const NO_MEDICAL_ADVICE =
  "These are estimates, not medical advice. FitMe AI never recommends supplements or medication. Talk to a qualified professional about personal health decisions.";

export const SAFETY_CONSENT_REQUIRED_ERROR =
  "This target is labeled dangerous. Acknowledge the warning to save, or choose safer targets.";

export type EvaluateSafetyInput = {
  sex: Sex;
  heightCm: number;
  currentWeightG: number;
  /** Used with weekly change to detect intentional loss (not goalType alone). */
  targetWeightG?: number;
  caloriesKcal: number;
  tdeeKcal: number;
  weeklyWeightChangeG: number;
  goalType: string;
};

export function computeBmi(weightG: number, heightCm: number): number {
  const kg = gToKg(weightG);
  const m = heightCm / 100;
  if (m <= 0) return 0;
  return kg / (m * m);
}

/** Loss intent from planned weekly rate and/or target below current — not goalType alone. */
export function isLosingIntent(input: {
  weeklyWeightChangeG: number;
  currentWeightG: number;
  targetWeightG?: number;
}): boolean {
  if (input.weeklyWeightChangeG < 0) return true;
  if (
    typeof input.targetWeightG === "number" &&
    input.targetWeightG < input.currentWeightG
  ) {
    return true;
  }
  return false;
}

function reasonMessage(code: SafetyReasonCode, sex: Sex): string {
  switch (code) {
    case "calories_below_floor":
      return `Daily calories are below the commonly cited floor of ${CALORIE_FLOOR_KCAL[sex]} kcal for ${sex === "female" ? "women" : "men"}. This is labeled dangerous and needs your explicit acknowledgement.`;
    case "calories_aggressive_deficit":
      return "Daily calories are a large cut vs your estimated burn (not recommended). You can still save if this is intentional.";
    case "bmi_underweight":
      return "Your current BMI is in the WHO underweight range (< 18.5). This is labeled dangerous and needs your explicit acknowledgement.";
    case "bmi_near_underweight_with_loss":
      return "Your BMI is close to the underweight range while aiming to lose weight (not recommended).";
    case "weekly_change_over_1pct":
      return "Planned weekly weight change is more than ~1% of your current bodyweight. This is labeled dangerous and needs your explicit acknowledgement.";
    case "weekly_change_aggressive":
      return "Planned weekly weight change is aggressive (above ~0.5% of bodyweight) — not recommended.";
  }
}

/**
 * Evaluate green / yellow / red for the effective targets about to be saved.
 * Red wins over yellow if both apply.
 */
export function evaluateSafetyLadder(
  input: EvaluateSafetyInput,
): SafetyAssessment {
  const reasons: SafetyReasonCode[] = [];
  const floor = CALORIE_FLOOR_KCAL[input.sex];
  const bmi = computeBmi(input.currentWeightG, input.heightCm);
  const losing = isLosingIntent(input);
  const absWeekly = Math.abs(input.weeklyWeightChangeG);
  const redWeekly = input.currentWeightG * WEEKLY_CHANGE_RED_FRACTION;
  const yellowWeekly = input.currentWeightG * WEEKLY_CHANGE_YELLOW_FRACTION;

  if (input.caloriesKcal < floor) {
    reasons.push("calories_below_floor");
  } else if (
    input.tdeeKcal > 0 &&
    input.caloriesKcal < input.tdeeKcal * AGGRESSIVE_DEFICIT_FRACTION
  ) {
    reasons.push("calories_aggressive_deficit");
  }

  // Epic AC: already-underweight BMI is dangerous on its own.
  if (bmi > 0 && bmi < BMI_UNDERWEIGHT) {
    reasons.push("bmi_underweight");
  } else if (losing && bmi >= BMI_UNDERWEIGHT && bmi < BMI_NEAR_UNDERWEIGHT) {
    reasons.push("bmi_near_underweight_with_loss");
  }

  if (absWeekly > redWeekly && redWeekly > 0) {
    reasons.push("weekly_change_over_1pct");
  } else if (absWeekly > yellowWeekly && yellowWeekly > 0) {
    reasons.push("weekly_change_aggressive");
  }

  const redCodes: SafetyReasonCode[] = [
    "calories_below_floor",
    "bmi_underweight",
    "weekly_change_over_1pct",
  ];
  const hasRed = reasons.some((r) => redCodes.includes(r));
  const level: SafetyLevel = hasRed
    ? "red"
    : reasons.length > 0
      ? "yellow"
      : "green";

  return {
    level,
    reasons,
    messages: reasons.map((r) => reasonMessage(r, input.sex)),
    citations: [...SAFETY_CITATIONS],
    requiresConsent: level === "red",
  };
}
