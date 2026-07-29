"use server";

import { requireSession } from "@/lib/dal";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";
import {
  getEditableFoodEntry,
  restoreFoodEntry,
  softDeleteFoodEntry,
  updateFoodEntry,
  type FoodEntryEditableDto,
  type UpdateFoodEntryInput,
} from "@/lib/dal/food-entry";
import { fieldErrorsFromZod } from "@/lib/auth/actions-shared";
import { logger } from "@/lib/logging";
import { err, ok, type Result } from "@/lib/result";
import { editFoodEntrySchema } from "@/lib/schemas/food-entry";

export type EditFoodEntryResult = Result<{ entry: FoodEntryEditableDto }>;
export type DeleteFoodEntryResult = Result<{ id: string }>;

export type FoodEntryActionDeps = {
  requireSession?: typeof requireSession;
  updateFoodEntry?: typeof updateFoodEntry;
  softDeleteFoodEntry?: typeof softDeleteFoodEntry;
  restoreFoodEntry?: typeof restoreFoodEntry;
  getEditableFoodEntry?: typeof getEditableFoodEntry;
};

/** Not-found and cross-user access both read as "not found" — no enumeration. */
const NOT_FOUND_MESSAGE = "That meal wasn't found — it may already be removed.";

/**
 * Edit a saved meal entry — name, portion, meal slot, time and macros
 * (Story 5.2 AC1/AC4). Changing `loggedAt` can move the entry to another day.
 * Fixing a mistake shouldn't feel like a big deal — no shame copy either way.
 */
export async function updateFoodEntryAction(
  id: string,
  input: unknown,
  deps: FoodEntryActionDeps = {},
): Promise<EditFoodEntryResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const updateEntry = deps.updateFoodEntry ?? updateFoodEntry;

  let userId: string;
  try {
    const user = await requireSessionFn();
    userId = user.id;
  } catch {
    return err("Please sign in to edit this meal.");
  }

  const parsed = editFoodEntrySchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const patch: UpdateFoodEntryInput = {
    ...parsed.data,
    loggedAt: new Date(parsed.data.loggedAt),
  };

  try {
    const entry = await updateEntry(userId, id, patch);
    logger.info("food_entry.update.ok", { event: "food_entry_update_ok" });
    return ok({ entry });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("food_entry.update.failed", {
      event: "food_entry_update_failed",
    });
    return err("Could not save your changes. Please try again.");
  }
}

/** Soft-delete a saved meal entry (Story 5.2 AC2). */
export async function deleteFoodEntryAction(
  id: string,
  deps: FoodEntryActionDeps = {},
): Promise<DeleteFoodEntryResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const deleteEntry = deps.softDeleteFoodEntry ?? softDeleteFoodEntry;

  let userId: string;
  try {
    const user = await requireSessionFn();
    userId = user.id;
  } catch {
    return err("Please sign in to remove this meal.");
  }

  try {
    await deleteEntry(userId, id);
    logger.info("food_entry.delete.ok", { event: "food_entry_delete_ok" });
    return ok({ id });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("food_entry.delete.failed", {
      event: "food_entry_delete_failed",
    });
    return err("Could not remove this meal. Please try again.");
  }
}

/** Undo a just-removed meal entry. */
export async function restoreFoodEntryAction(
  id: string,
  deps: FoodEntryActionDeps = {},
): Promise<DeleteFoodEntryResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const restoreEntry = deps.restoreFoodEntry ?? restoreFoodEntry;

  let userId: string;
  try {
    const user = await requireSessionFn();
    userId = user.id;
  } catch {
    return err("Please sign in to restore this meal.");
  }

  try {
    await restoreEntry(userId, id);
    logger.info("food_entry.restore.ok", { event: "food_entry_restore_ok" });
    return ok({ id });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("food_entry.restore.failed", {
      event: "food_entry_restore_failed",
    });
    return err("Could not restore this meal. Please try again.");
  }
}
