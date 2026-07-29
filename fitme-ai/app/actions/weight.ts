"use server";

import { requireSession } from "@/lib/dal";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";
import {
  createWeightEntry,
  restoreWeightEntry,
  softDeleteWeightEntry,
  updateWeightEntry,
  type CreateWeightEntryInput,
  type WeightEntryDto,
} from "@/lib/dal/weight-entry";
import { fieldErrorsFromZod } from "@/lib/auth/actions-shared";
import { logger } from "@/lib/logging";
import { err, ok, type Result } from "@/lib/result";
import {
  editWeightEntrySchema,
  saveWeightEntrySchema,
} from "@/lib/schemas/weight";

export type SaveWeightResult = Result<{ entry: WeightEntryDto }>;
export type WeightEntryMutationResult = Result<{ id: string }>;

export type SaveWeightActionDeps = {
  requireSession?: typeof requireSession;
  createWeightEntry?: typeof createWeightEntry;
};

export type WeightEntryActionDeps = {
  requireSession?: typeof requireSession;
  updateWeightEntry?: typeof updateWeightEntry;
  softDeleteWeightEntry?: typeof softDeleteWeightEntry;
  restoreWeightEntry?: typeof restoreWeightEntry;
};

/** Not-found and cross-user access both read as "not found" — no enumeration. */
const NOT_FOUND_MESSAGE =
  "That weigh-in wasn't found — it may already be removed.";

/**
 * Persist a weight check-in and update profile current weight (Story 6.1).
 */
export async function saveWeightEntryAction(
  input: unknown,
  deps: SaveWeightActionDeps = {},
): Promise<SaveWeightResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const createEntry = deps.createWeightEntry ?? createWeightEntry;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to log your weight.");
  }

  const parsed = saveWeightEntrySchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const data = parsed.data;
  const createInput: CreateWeightEntryInput = {
    userId,
    weightG: data.weightG,
    recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
    note: data.note,
  };

  try {
    const entry = await createEntry(createInput);
    logger.info("weight.save.ok", {
      event: "weight_save_ok",
    });
    return ok({ entry });
  } catch {
    logger.error("weight.save.failed", { event: "weight_save_failed" });
    return err("Could not save your weigh-in. Please try again.");
  }
}

/** Correct a saved weigh-in — value, date or note (FR-9 correction path). */
export async function updateWeightEntryAction(
  id: string,
  input: unknown,
  deps: WeightEntryActionDeps = {},
): Promise<SaveWeightResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const updateEntry = deps.updateWeightEntry ?? updateWeightEntry;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to edit this weigh-in.");
  }

  const parsed = editWeightEntrySchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  try {
    const entry = await updateEntry(userId, id, {
      weightG: parsed.data.weightG,
      recordedAt: new Date(parsed.data.recordedAt),
      note: parsed.data.note,
    });
    logger.info("weight.update.ok", { event: "weight_update_ok" });
    return ok({ entry });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("weight.update.failed", { event: "weight_update_failed" });
    return err("Could not save your changes. Please try again.");
  }
}

/** Soft-delete a weigh-in (reversible via restore). */
export async function deleteWeightEntryAction(
  id: string,
  deps: WeightEntryActionDeps = {},
): Promise<WeightEntryMutationResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const deleteEntry = deps.softDeleteWeightEntry ?? softDeleteWeightEntry;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to remove this weigh-in.");
  }

  try {
    await deleteEntry(userId, id);
    logger.info("weight.delete.ok", { event: "weight_delete_ok" });
    return ok({ id });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("weight.delete.failed", { event: "weight_delete_failed" });
    return err("Could not remove this weigh-in. Please try again.");
  }
}

/** Undo a just-removed weigh-in. */
export async function restoreWeightEntryAction(
  id: string,
  deps: WeightEntryActionDeps = {},
): Promise<WeightEntryMutationResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const restoreEntry = deps.restoreWeightEntry ?? restoreWeightEntry;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to restore this weigh-in.");
  }

  try {
    await restoreEntry(userId, id);
    logger.info("weight.restore.ok", { event: "weight_restore_ok" });
    return ok({ id });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("weight.restore.failed", { event: "weight_restore_failed" });
    return err("Could not restore this weigh-in. Please try again.");
  }
}
