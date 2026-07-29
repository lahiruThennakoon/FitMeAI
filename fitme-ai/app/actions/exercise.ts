"use server";

import { requireSession } from "@/lib/dal";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";
import {
  createExerciseEntry,
  restoreExerciseEntry,
  softDeleteExerciseEntry,
  updateExerciseEntry,
  type CreateExerciseEntryInput,
  type ExerciseEntryDto,
  type ExerciseEntryEditableDto,
  type UpdateExerciseEntryInput,
} from "@/lib/dal/exercise-entry";
import { getProfileForUser } from "@/lib/dal/profile";
import { estimateExerciseBurn } from "@/lib/domain/burn/exercise-estimate";
import { gToKg } from "@/lib/domain/targets/units";
import { fieldErrorsFromZod } from "@/lib/auth/actions-shared";
import { logger } from "@/lib/logging";
import { err, ok, type Result } from "@/lib/result";
import {
  editExerciseEntrySchema,
  saveExerciseEntrySchema,
} from "@/lib/schemas/exercise";

export type SaveExerciseResult = Result<{
  entry: ExerciseEntryDto;
  estimateLabeled: true;
}>;

export type EditExerciseResult = Result<{
  entry: ExerciseEntryEditableDto;
  estimateLabeled: true;
}>;

export type DeleteExerciseResult = Result<{ id: string }>;

export type SaveExerciseActionDeps = {
  requireSession?: typeof requireSession;
  getProfileForUser?: typeof getProfileForUser;
  createExerciseEntry?: typeof createExerciseEntry;
};

export type ExerciseEntryActionDeps = {
  requireSession?: typeof requireSession;
  getProfileForUser?: typeof getProfileForUser;
  updateExerciseEntry?: typeof updateExerciseEntry;
  softDeleteExerciseEntry?: typeof softDeleteExerciseEntry;
  restoreExerciseEntry?: typeof restoreExerciseEntry;
};

/** Not-found and cross-user access both read as "not found" — no enumeration. */
const NOT_FOUND_MESSAGE =
  "That workout wasn't found — it may already be removed.";

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

/**
 * Edit a saved workout (Story 5.3) — core fields, when it happened, and the
 * optional details. Recomputes MET burn and keeps it labelled as an estimate.
 */
export async function updateExerciseEntryAction(
  id: string,
  input: unknown,
  deps: ExerciseEntryActionDeps = {},
): Promise<EditExerciseResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const getProfile = deps.getProfileForUser ?? getProfileForUser;
  const updateEntry = deps.updateExerciseEntry ?? updateExerciseEntry;

  let userId: string;
  try {
    const user = await requireSessionFn();
    userId = user.id;
  } catch {
    return err("Please sign in to edit this workout.");
  }

  const parsed = editExerciseEntrySchema.safeParse(input);
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

  const patch: UpdateExerciseEntryInput = {
    type: data.type,
    // Non-custom types never keep a label (ignore crafted clients).
    customLabel:
      data.type === "custom" ? data.customLabel?.trim() ?? null : null,
    durationMin: data.durationMin,
    intensity: data.intensity,
    performedAt: new Date(data.performedAt),
    distanceM: data.distanceM == null ? null : Math.round(data.distanceM),
    sets: data.sets ?? null,
    reps: data.reps ?? null,
    weightG: data.weightG ?? null,
    notes: data.notes?.trim() || null,
    estimatedKcal: estimate.estimatedKcal,
    metUsed: estimate.met,
    weightKgUsed: estimate.weightKgUsed,
  };

  try {
    const entry = await updateEntry(userId, id, patch);
    logger.info("exercise.update.ok", {
      event: "exercise_update_ok",
      type: data.type,
      durationMin: patch.durationMin,
    });
    return ok({ entry, estimateLabeled: true as const });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("exercise.update.failed", { event: "exercise_update_failed" });
    return err("Could not save your changes. Please try again.");
  }
}

/** Soft-delete a saved workout (Story 5.3 AC3). */
export async function deleteExerciseEntryAction(
  id: string,
  deps: ExerciseEntryActionDeps = {},
): Promise<DeleteExerciseResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const deleteEntry = deps.softDeleteExerciseEntry ?? softDeleteExerciseEntry;

  let userId: string;
  try {
    const user = await requireSessionFn();
    userId = user.id;
  } catch {
    return err("Please sign in to remove this workout.");
  }

  try {
    await deleteEntry(userId, id);
    logger.info("exercise.delete.ok", { event: "exercise_delete_ok" });
    return ok({ id });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("exercise.delete.failed", { event: "exercise_delete_failed" });
    return err("Could not remove this workout. Please try again.");
  }
}

/** Undo a just-removed workout. */
export async function restoreExerciseEntryAction(
  id: string,
  deps: ExerciseEntryActionDeps = {},
): Promise<DeleteExerciseResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const restoreEntry = deps.restoreExerciseEntry ?? restoreExerciseEntry;

  let userId: string;
  try {
    const user = await requireSessionFn();
    userId = user.id;
  } catch {
    return err("Please sign in to restore this workout.");
  }

  try {
    await restoreEntry(userId, id);
    logger.info("exercise.restore.ok", { event: "exercise_restore_ok" });
    return ok({ id });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("exercise.restore.failed", {
      event: "exercise_restore_failed",
    });
    return err("Could not restore this workout. Please try again.");
  }
}
