import type { GoalType } from "@/lib/domain/targets/suggest-targets";

/** Weight gap (g) we treat as "the same weight" — scales vary by more than this. */
const SAME_WEIGHT_G = 500;

/**
 * Warn when the chosen goal type points the opposite way to the target weight,
 * e.g. "weight loss" with a target above current. We warn instead of blocking:
 * a coach-set plan or a recomposition goal can legitimately look contradictory,
 * and the user knows their situation better than we do.
 */
export function goalDirectionWarning(input: {
  goalType: GoalType;
  currentWeightG: number;
  targetWeightG: number;
}): string | null {
  const { goalType, currentWeightG, targetWeightG } = input;
  if (!Number.isFinite(currentWeightG) || !Number.isFinite(targetWeightG)) {
    return null;
  }
  if (currentWeightG <= 0 || targetWeightG <= 0) return null;

  const deltaG = targetWeightG - currentWeightG;
  if (Math.abs(deltaG) <= SAME_WEIGHT_G) {
    if (goalType === "weight_loss") {
      return "Your target weight is the same as your current weight, so a weight-loss target won't have anything to work toward. Maintenance may fit better.";
    }
    if (goalType === "muscle_gain") {
      return "Your target weight matches your current weight. That's fine for recomposition — just know the calorie target won't include a gaining surplus.";
    }
    return null;
  }

  if (goalType === "weight_loss" && deltaG > 0) {
    return "You picked weight loss but your target weight is above your current weight. Check both before saving.";
  }
  if (goalType === "muscle_gain" && deltaG < 0) {
    return "You picked muscle gain but your target weight is below your current weight. That works for recomposition — otherwise check both.";
  }
  if (goalType === "maintenance") {
    return "Maintenance keeps your weight where it is, so your target weight won't change the calorie target.";
  }
  return null;
}
