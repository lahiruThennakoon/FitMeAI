/**
 * Mifflin–St Jeor BMR (1990) and TDEE via standard activity multipliers.
 * Results are estimates, not medical advice.
 *
 * BMR (kcal/day):
 *   male:   10·kg + 6.25·cm − 5·age + 5
 *   female: 10·kg + 6.25·cm − 5·age − 161
 *
 * Activity multipliers (common public-health defaults):
 *   sedentary 1.2, lightly_active 1.375, moderately_active 1.55,
 *   very_active 1.725, extra_active 1.9
 */

export type Sex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extra_active";

export type PreferredUnits = "metric" | "imperial";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export const MIFFLIN_ST_JEOR_FORMULA = {
  male: "BMR = 10×weight(kg) + 6.25×height(cm) − 5×age + 5",
  female: "BMR = 10×weight(kg) + 6.25×height(cm) − 5×age − 161",
  tdee: "TDEE = BMR × activity multiplier",
} as const;

export type BmrInput = {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
};

export function computeBmr(input: BmrInput): number {
  const { weightKg, heightCm, ageYears, sex } = input;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const bmr = sex === "male" ? base + 5 : base - 161;
  return Math.round(bmr);
}

export function computeTdee(bmrKcal: number, activity: ActivityLevel): number {
  return Math.round(bmrKcal * ACTIVITY_MULTIPLIERS[activity]);
}
