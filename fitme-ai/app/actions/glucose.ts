"use server";

import { requireSession } from "@/lib/dal";
import {
  createGlucoseEntry,
  restoreGlucoseEntry,
  softDeleteGlucoseEntry,
  updateGlucoseEntry,
  type GlucoseEntryDto,
} from "@/lib/dal/glucose-entry";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";
import { fieldErrorsFromZod } from "@/lib/auth/actions-shared";
import { mgDlFromDisplay } from "@/lib/domain/glucose/units";
import { logger } from "@/lib/logging";
import { err, ok, type Result } from "@/lib/result";
import {
  createGlucoseEntrySchema,
  deleteGlucoseEntrySchema,
  updateGlucoseEntrySchema,
} from "@/lib/schemas/glucose";

export type GlucoseActionResult = Result<{ entry: GlucoseEntryDto }>;
export type GlucoseDeleteResult = Result<{ ok: true }>;

export type GlucoseActionDeps = {
  requireSession?: typeof requireSession;
  createGlucoseEntry?: typeof createGlucoseEntry;
  updateGlucoseEntry?: typeof updateGlucoseEntry;
  softDeleteGlucoseEntry?: typeof softDeleteGlucoseEntry;
  restoreGlucoseEntry?: typeof restoreGlucoseEntry;
};

const NOT_FOUND_MESSAGE =
  "That reading wasn't found — it may already have been removed.";

export async function createGlucoseEntryAction(
  input: unknown,
  deps: GlucoseActionDeps = {},
): Promise<GlucoseActionResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const create = deps.createGlucoseEntry ?? createGlucoseEntry;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to log glucose.");
  }

  const parsed = createGlucoseEntrySchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const data = parsed.data;
  try {
    const entry = await create({
      userId,
      valueMgDl: mgDlFromDisplay(data.value, data.unit),
      measuredAt: data.measuredAt ? new Date(data.measuredAt) : new Date(),
      context: data.context,
      note: data.note,
    });
    logger.info("glucose.create.ok", { event: "glucose_create_ok" });
    return ok({ entry });
  } catch {
    logger.error("glucose.create.failed", { event: "glucose_create_failed" });
    return err("Could not save that reading. Please try again.");
  }
}

export async function updateGlucoseEntryAction(
  input: unknown,
  deps: GlucoseActionDeps = {},
): Promise<GlucoseActionResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const update = deps.updateGlucoseEntry ?? updateGlucoseEntry;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to edit glucose.");
  }

  const parsed = updateGlucoseEntrySchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const data = parsed.data;
  try {
    const entry = await update(userId, data.id, {
      valueMgDl: mgDlFromDisplay(data.value, data.unit),
      measuredAt: new Date(data.measuredAt),
      context: data.context,
      note: data.note,
    });
    logger.info("glucose.update.ok", { event: "glucose_update_ok" });
    return ok({ entry });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("glucose.update.failed", { event: "glucose_update_failed" });
    return err("Could not update that reading. Please try again.");
  }
}

export async function deleteGlucoseEntryAction(
  input: unknown,
  deps: GlucoseActionDeps = {},
): Promise<GlucoseDeleteResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const softDelete = deps.softDeleteGlucoseEntry ?? softDeleteGlucoseEntry;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to remove glucose readings.");
  }

  const parsed = deleteGlucoseEntrySchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  try {
    await softDelete(userId, parsed.data.id);
    logger.info("glucose.delete.ok", { event: "glucose_delete_ok" });
    return ok({ ok: true as const });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("glucose.delete.failed", { event: "glucose_delete_failed" });
    return err("Could not remove that reading. Please try again.");
  }
}

/** Undo a just-removed reading. */
export async function restoreGlucoseEntryAction(
  input: unknown,
  deps: GlucoseActionDeps = {},
): Promise<GlucoseDeleteResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const restore = deps.restoreGlucoseEntry ?? restoreGlucoseEntry;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to restore glucose readings.");
  }

  const parsed = deleteGlucoseEntrySchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  try {
    await restore(userId, parsed.data.id);
    logger.info("glucose.restore.ok", { event: "glucose_restore_ok" });
    return ok({ ok: true as const });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("glucose.restore.failed", { event: "glucose_restore_failed" });
    return err("Could not restore that reading. Please try again.");
  }
}
