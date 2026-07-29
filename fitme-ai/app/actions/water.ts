"use server";

import { requireSession } from "@/lib/dal";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";
import {
  createWaterEntry,
  restoreWaterEntry,
  softDeleteWaterEntry,
  type CreateWaterEntryInput,
  type WaterEntryDto,
} from "@/lib/dal/water-entry";
import { fieldErrorsFromZod } from "@/lib/auth/actions-shared";
import { logger } from "@/lib/logging";
import { err, ok, type Result } from "@/lib/result";
import { saveWaterEntrySchema } from "@/lib/schemas/water";

export type SaveWaterResult = Result<{
  entry: WaterEntryDto;
}>;

export type WaterEntryMutationResult = Result<{ id: string }>;

export type SaveWaterActionDeps = {
  requireSession?: typeof requireSession;
  createWaterEntry?: typeof createWaterEntry;
};

export type WaterEntryActionDeps = {
  requireSession?: typeof requireSession;
  softDeleteWaterEntry?: typeof softDeleteWaterEntry;
  restoreWaterEntry?: typeof restoreWaterEntry;
};

/** Not-found and cross-user access both read as "not found" — no enumeration. */
const NOT_FOUND_MESSAGE =
  "That water log wasn't found — it may already be removed.";

/**
 * Persist a manual water log (Story 5.1 / FR-15). Amounts are exact user
 * input — never blocked by a missing target; a soft default aim is applied
 * for display only (see DEFAULT_WATER_ML_TARGET).
 */
export async function saveWaterEntryAction(
  input: unknown,
  deps: SaveWaterActionDeps = {},
): Promise<SaveWaterResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const createEntry = deps.createWaterEntry ?? createWaterEntry;

  let userId: string;
  try {
    const user = await requireSessionFn();
    userId = user.id;
  } catch {
    return err("Please sign in to log water.");
  }

  const parsed = saveWaterEntrySchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const data = parsed.data;
  const loggedAt = data.loggedAt ? new Date(data.loggedAt) : new Date();

  const createInput: CreateWaterEntryInput = {
    userId,
    amountMl: Math.round(data.amountMl),
    loggedAt,
  };

  try {
    const entry = await createEntry(createInput);
    logger.info("water.save.ok", {
      event: "water_save_ok",
      amountMl: createInput.amountMl,
    });
    return ok({ entry });
  } catch {
    logger.error("water.save.failed", { event: "water_save_failed" });
    return err("Could not save your water log. Please try again.");
  }
}

/** Soft-delete a water log — a mis-tap shouldn't be permanent. */
export async function deleteWaterEntryAction(
  id: string,
  deps: WaterEntryActionDeps = {},
): Promise<WaterEntryMutationResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const deleteEntry = deps.softDeleteWaterEntry ?? softDeleteWaterEntry;

  let userId: string;
  try {
    const user = await requireSessionFn();
    userId = user.id;
  } catch {
    return err("Please sign in to remove this water log.");
  }

  try {
    await deleteEntry(userId, id);
    logger.info("water.delete.ok", { event: "water_delete_ok" });
    return ok({ id });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("water.delete.failed", { event: "water_delete_failed" });
    return err("Could not remove this water log. Please try again.");
  }
}

/** Undo a just-removed water log. */
export async function restoreWaterEntryAction(
  id: string,
  deps: WaterEntryActionDeps = {},
): Promise<WaterEntryMutationResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const restoreEntry = deps.restoreWaterEntry ?? restoreWaterEntry;

  let userId: string;
  try {
    const user = await requireSessionFn();
    userId = user.id;
  } catch {
    return err("Please sign in to restore this water log.");
  }

  try {
    await restoreEntry(userId, id);
    logger.info("water.restore.ok", { event: "water_restore_ok" });
    return ok({ id });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("water.restore.failed", { event: "water_restore_failed" });
    return err("Could not restore this water log. Please try again.");
  }
}
