"use server";

import { requireSession } from "@/lib/dal";
import {
  createExerciseEntry,
  type CreateExerciseEntryInput,
  type ExerciseEntryDto,
} from "@/lib/dal/exercise-entry";
import { getProfileForUser } from "@/lib/dal/profile";
import { estimateExerciseBurn } from "@/lib/domain/burn/exercise-estimate";
import { gToKg } from "@/lib/domain/targets/units";
import { fieldErrorsFromZod } from "@/lib/auth/actions-shared";
import { logger } from "@/lib/logging";
import { err, ok, type Result } from "@/lib/result";
import { saveExerciseEntrySchema } from "@/lib/schemas/exercise";

export type SaveExerciseResult = Result<{
  entry: ExerciseEntryDto;
  estimateLabeled: true;
}>;

export type SaveExerciseActionDeps = {
  requireSession?: typeof requireSession;
  getProfileForUser?: typeof getProfileForUser;
  createExerciseEntry?: typeof createExerciseEntry;
};

/**
 * Persist a manual exercise log with MET-based calorie estimate (FR-14).
 */
export async function saveExerciseEntryAction(
  input: unknown,
  deps: SaveExerciseActionDeps = {},
): Promise<SaveExerciseResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const getProfile = deps.getProfileForUser ?? getProfileForUser;
  const createEntry = deps.createExerciseEntry ?? createExerciseEntry;

  let userId: string;
  try {
    const user = await requireSessionFn();
    userId = user.id;
  } catch {
    return err("Please sign in to log exercise.");
  }

  const parsed = saveExerciseEntrySchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const data = parsed.data;
  const profile = await getProfile(userId);
  const weightKg = profile ? gToKg(profile.currentWeightG) : null;
  const estimate = estimateExerciseBurn({
    type: data.type,
    intensity: data.intensity,
    durationMin: data.durationMin,
    weightKg,
  });

  const performedAt = data.performedAt
    ? new Date(data.performedAt)
    : new Date();

  const createInput: CreateExerciseEntryInput = {
    userId,
    type: data.type,
    customLabel:
      data.type === "custom"
        ? data.customLabel?.trim() ?? null
        : data.customLabel?.trim() || null,
    durationMin: Math.round(data.durationMin),
    intensity: data.intensity,
    distanceM:
      data.distanceM == null ? null : Math.round(data.distanceM),
    sets: data.sets ?? null,
    reps: data.reps ?? null,
    weightG: data.weightG ?? null,
    notes: data.notes?.trim() || null,
    estimatedKcal: estimate.estimatedKcal,
    metUsed: estimate.met,
    weightKgUsed: estimate.weightKgUsed,
    performedAt,
  };

  try {
    const entry = await createEntry(createInput);
    logger.info("exercise.save.ok", {
      event: "exercise_save_ok",
      type: data.type,
      durationMin: createInput.durationMin,
    });
    return ok({ entry, estimateLabeled: true as const });
  } catch {
    logger.error("exercise.save.failed", { event: "exercise_save_failed" });
    return err("Could not save your workout. Please try again.");
  }
}
