import { computeBmr, computeTdee, type ActivityLevel, type Sex } from "./bmr";
import { gToKg } from "./units";

export type GoalType =
  | "weight_loss"
  | "maintenance"
  | "muscle_gain"
  | "general_health";

export type SuggestTargetsInput = {
  weightG: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  targetWeightG: number;
};

export type SuggestedTargets = {
  bmrKcal: number;
  tdeeKcal: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  waterMl: number;
  steps: number;
  exerciseMinutes: number;
  /** Signed: negative = loss, positive = gain (grams per week). */
  weeklyWeightChangeG: number;
};

/** ~7700 kcal ≈ 1 kg body mass (rule of thumb for transparency UI). */
const KCAL_PER_KG = 7700;

/**
 * Suggest daily targets from profile (Story 1.6 / FR-4).
 * Macro/water/steps/exercise heuristics are documented public-health defaults —
 * not medical prescriptions. Safety ladder (floors/consent) is Story 1.7.
 */
export function suggestTargets(input: SuggestTargetsInput): SuggestedTargets {
  const weightKg = gToKg(input.weightG);
  const bmrKcal = computeBmr({
    weightKg,
    heightCm: input.heightCm,
    ageYears: input.ageYears,
    sex: input.sex,
  });
  const tdeeKcal = computeTdee(bmrKcal, input.activityLevel);

  const towardTarget =
    input.targetWeightG < input.weightG
      ? "lose"
      : input.targetWeightG > input.weightG
        ? "gain"
        : "maintain";

  let calorieDelta = 0;
  let weeklyWeightChangeG = 0;

  switch (input.goalType) {
    case "weight_loss":
      calorieDelta = towardTarget === "gain" ? 0 : -500;
      // grams/week ≈ (kcal/day × 7 × 1000) / 7700
      weeklyWeightChangeG = Math.round((calorieDelta * 7 * 1000) / KCAL_PER_KG);
      break;
    case "muscle_gain":
      calorieDelta = towardTarget === "lose" ? 0 : 300;
      weeklyWeightChangeG = Math.round((calorieDelta * 7 * 1000) / KCAL_PER_KG);
      break;
    case "maintenance":
    case "general_health":
      calorieDelta = 0;
      weeklyWeightChangeG = 0;
      break;
  }

  const caloriesKcal = Math.max(0, tdeeKcal + calorieDelta);

  // Protein ~1.6 g/kg (ISSN-style general athletic guidance) for loss/gain;
  // ~1.2 g/kg for maintenance/general health.
  const proteinPerKg =
    input.goalType === "weight_loss" || input.goalType === "muscle_gain"
      ? 1.6
      : 1.2;
  const proteinG = Math.round(weightKg * proteinPerKg);

  // Fat ~25% of calories; remainder carbs. Fibre fixed adult guideline ~30 g.
  const fatG = Math.round((caloriesKcal * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((caloriesKcal - proteinG * 4 - fatG * 9) / 4));
  const fibreG = 30;

  // ~35 ml/kg water (common heuristic).
  const waterMl = Math.round(weightKg * 35);
  const steps = 8000;
  const exerciseMinutes =
    input.activityLevel === "sedentary"
      ? 20
      : input.activityLevel === "extra_active"
        ? 45
        : 30;

  return {
    bmrKcal,
    tdeeKcal,
    caloriesKcal,
    proteinG,
    carbsG,
    fatG,
    fibreG,
    waterMl,
    steps,
    exerciseMinutes,
    weeklyWeightChangeG,
  };
}

export function mergeOverrides(
  suggested: SuggestedTargets,
  overrides: Partial<{
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fibreG: number;
    waterMl: number;
    steps: number;
    exerciseMinutes: number;
    weeklyWeightChangeG: number;
  }>,
): SuggestedTargets {
  return {
    ...suggested,
    ...overrides,
    bmrKcal: suggested.bmrKcal,
    tdeeKcal: suggested.tdeeKcal,
  };
}
