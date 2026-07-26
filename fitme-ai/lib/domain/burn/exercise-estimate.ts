/**
 * Exercise calorie estimates (Story 3.2 / FR-14).
 * MET × body weight (kg) × duration (hours). Values are estimates, not exact.
 */

export const EXERCISE_TYPES = [
  "walking",
  "running",
  "treadmill",
  "cycling",
  "strength",
  "swimming",
  "sports",
  "custom",
] as const;

export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const EXERCISE_INTENSITIES = ["low", "moderate", "high"] as const;

export type ExerciseIntensity = (typeof EXERCISE_INTENSITIES)[number];

/** Fallback body mass when profile weight is unavailable. */
export const DEFAULT_EXERCISE_WEIGHT_KG = 70;

export const EXERCISE_ESTIMATE_LIMITATION =
  "Estimated calories burned — not an exact measurement. Based on standard MET values and your body weight.";

/**
 * Approximate MET values by activity × intensity
 * (Compendium of Physical Activities–style public defaults).
 */
export const EXERCISE_MET_TABLE: Record<
  ExerciseType,
  Record<ExerciseIntensity, number>
> = {
  walking: { low: 2.5, moderate: 3.5, high: 4.5 },
  running: { low: 7.0, moderate: 9.8, high: 11.5 },
  treadmill: { low: 4.5, moderate: 6.5, high: 8.5 },
  cycling: { low: 4.0, moderate: 6.8, high: 10.0 },
  strength: { low: 3.0, moderate: 5.0, high: 6.0 },
  swimming: { low: 5.0, moderate: 7.0, high: 9.5 },
  sports: { low: 4.0, moderate: 6.5, high: 8.5 },
  custom: { low: 3.0, moderate: 5.0, high: 7.0 },
};

export type EstimateExerciseInput = {
  type: ExerciseType;
  intensity: ExerciseIntensity;
  durationMin: number;
  /** Canonical kg; omit → DEFAULT_EXERCISE_WEIGHT_KG. */
  weightKg?: number | null;
};

export type ExerciseEstimate = {
  estimatedKcal: number;
  met: number;
  weightKgUsed: number;
  usedDefaultWeight: boolean;
  formula: string;
  limitation: string;
};

export function metFor(
  type: ExerciseType,
  intensity: ExerciseIntensity,
): number {
  return EXERCISE_MET_TABLE[type][intensity];
}

/**
 * kcal = MET × kg × hours. Duration must be > 0 (caller validates).
 */
export function estimateExerciseBurn(
  input: EstimateExerciseInput,
): ExerciseEstimate {
  const met = metFor(input.type, input.intensity);
  const usedDefaultWeight =
    input.weightKg == null ||
    !Number.isFinite(input.weightKg) ||
    input.weightKg <= 0;
  const weightKgUsed = usedDefaultWeight
    ? DEFAULT_EXERCISE_WEIGHT_KG
    : input.weightKg!;
  const hours = input.durationMin / 60;
  const estimatedKcal = Math.max(0, Math.round(met * weightKgUsed * hours));

  return {
    estimatedKcal,
    met,
    weightKgUsed,
    usedDefaultWeight,
    formula: `kcal ≈ MET (${met}) × weight (${weightKgUsed} kg) × duration (${hours.toFixed(2)} h)`,
    limitation: EXERCISE_ESTIMATE_LIMITATION,
  };
}

export function exerciseTypeLabel(type: ExerciseType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
