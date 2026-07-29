"use server";

import { requireSession } from "@/lib/dal";
import {
  ActiveFastExistsError,
  FastingOverlapError,
  FastingRangeError,
  discardActiveFastingSession,
  endFastingSession,
  logPastFastingSession,
  restoreFastingSession,
  softDeleteFastingSession,
  startFastingSession,
  updateFastingSession,
  type FastingSessionDto,
} from "@/lib/dal/fasting-session";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";
import { fieldErrorsFromZod } from "@/lib/auth/actions-shared";
import { logger } from "@/lib/logging";
import { err, ok, type Result } from "@/lib/result";
import {
  endFastingSessionSchema,
  deleteFastingSessionSchema,
  discardFastingSessionSchema,
  logPastFastingSessionSchema,
  startFastingSessionSchema,
  updateFastingSessionSchema,
} from "@/lib/schemas/fasting";

export type FastingActionResult = Result<{ session: FastingSessionDto }>;

export type FastingActionDeps = {
  requireSession?: typeof requireSession;
  startFastingSession?: typeof startFastingSession;
  endFastingSession?: typeof endFastingSession;
  softDeleteFastingSession?: typeof softDeleteFastingSession;
  discardActiveFastingSession?: typeof discardActiveFastingSession;
  restoreFastingSession?: typeof restoreFastingSession;
  logPastFastingSession?: typeof logPastFastingSession;
  updateFastingSession?: typeof updateFastingSession;
};

const NOT_FOUND_MESSAGE =
  "That fasting session wasn't found — it may already be ended.";

const OVERLAP_MESSAGE =
  "That window overlaps another fast — adjust the times first.";

const RANGE_MESSAGE = "End must be after the start.";

/** Start a new fasting session (Story 7.1). */
export async function startFastingSessionAction(
  input: unknown = {},
  deps: FastingActionDeps = {},
): Promise<FastingActionResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const start = deps.startFastingSession ?? startFastingSession;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to start a fast.");
  }

  const parsed = startFastingSessionSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const data = parsed.data;
  try {
    const session = await start({
      userId,
      startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
      plannedDurationMin: data.plannedDurationMin,
      protocolLabel: data.protocolLabel,
      notes: data.notes,
    });
    logger.info("fasting.start.ok", { event: "fasting_start_ok" });
    return ok({ session });
  } catch (e) {
    if (e instanceof ActiveFastExistsError) {
      return err("You already have a fast in progress — end it first.");
    }
    if (e instanceof FastingOverlapError) return err(OVERLAP_MESSAGE);
    logger.error("fasting.start.failed", { event: "fasting_start_failed" });
    return err("Could not start your fast. Please try again.");
  }
}

/** End the active fasting session (Story 7.1). */
export async function endFastingSessionAction(
  input: unknown = {},
  deps: FastingActionDeps = {},
): Promise<FastingActionResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const end = deps.endFastingSession ?? endFastingSession;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to end a fast.");
  }

  const parsed = endFastingSessionSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  try {
    const session = await end(
      userId,
      parsed.data.sessionId,
      parsed.data.endedAt ? new Date(parsed.data.endedAt) : new Date(),
    );
    logger.info("fasting.end.ok", { event: "fasting_end_ok" });
    return ok({ session });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("fasting.end.failed", { event: "fasting_end_failed" });
    return err("Could not end your fast. Please try again.");
  }
}

export type FastingDeleteResult = Result<{ ok: true }>;

/** Remove a completed fast from history (Story 7.3). */
export async function deleteFastingSessionAction(
  input: unknown,
  deps: FastingActionDeps = {},
): Promise<FastingDeleteResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const softDelete = deps.softDeleteFastingSession ?? softDeleteFastingSession;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to manage fasting history.");
  }

  const parsed = deleteFastingSessionSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  try {
    await softDelete(userId, parsed.data.sessionId);
    logger.info("fasting.delete.ok", { event: "fasting_delete_ok" });
    return ok({ ok: true as const });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    if (e instanceof Error && e.message.includes("active fast")) {
      return err("End your fast before removing it from history.");
    }
    logger.error("fasting.delete.failed", { event: "fasting_delete_failed" });
    return err("Could not remove that fast. Please try again.");
  }
}

/**
 * Abandon the in-progress fast without recording it. Starting one by mistake
 * shouldn't leave a fake entry in history.
 */
export async function discardActiveFastAction(
  input: unknown = {},
  deps: FastingActionDeps = {},
): Promise<FastingDeleteResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const discard =
    deps.discardActiveFastingSession ?? discardActiveFastingSession;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to manage your fast.");
  }

  const parsed = discardFastingSessionSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  try {
    await discard(userId, parsed.data.sessionId);
    logger.info("fasting.discard.ok", { event: "fasting_discard_ok" });
    return ok({ ok: true as const });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err("There's no fast in progress to discard.");
    }
    logger.error("fasting.discard.failed", { event: "fasting_discard_failed" });
    return err("Could not discard your fast. Please try again.");
  }
}

/** Restore a fast removed from history (undo path). */
export async function restoreFastingSessionAction(
  input: unknown,
  deps: FastingActionDeps = {},
): Promise<FastingDeleteResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const restore = deps.restoreFastingSession ?? restoreFastingSession;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to manage fasting history.");
  }

  const parsed = deleteFastingSessionSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  try {
    await restore(userId, parsed.data.sessionId);
    logger.info("fasting.restore.ok", { event: "fasting_restore_ok" });
    return ok({ ok: true as const });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    if (e instanceof FastingOverlapError) {
      return err(OVERLAP_MESSAGE);
    }
    logger.error("fasting.restore.failed", { event: "fasting_restore_failed" });
    return err("Could not restore that fast. Please try again.");
  }
}

/** Record a fast that already finished — the "forgot to press start" path. */
export async function logPastFastAction(
  input: unknown,
  deps: FastingActionDeps = {},
): Promise<FastingActionResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const logPast = deps.logPastFastingSession ?? logPastFastingSession;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to log a fast.");
  }

  const parsed = logPastFastingSessionSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const data = parsed.data;
  try {
    const session = await logPast({
      userId,
      startedAt: new Date(data.startedAt),
      endedAt: new Date(data.endedAt),
      plannedDurationMin: data.plannedDurationMin,
      protocolLabel: data.protocolLabel,
      notes: data.notes,
    });
    logger.info("fasting.log_past.ok", { event: "fasting_log_past_ok" });
    return ok({ session });
  } catch (e) {
    if (e instanceof FastingOverlapError) return err(OVERLAP_MESSAGE);
    if (e instanceof FastingRangeError) return err(RANGE_MESSAGE);
    logger.error("fasting.log_past.failed", {
      event: "fasting_log_past_failed",
    });
    return err("Could not save that fast. Please try again.");
  }
}

/** Correct a session's times, protocol, planned length or notes. */
export async function updateFastingSessionAction(
  input: unknown,
  deps: FastingActionDeps = {},
): Promise<FastingActionResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const update = deps.updateFastingSession ?? updateFastingSession;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to edit this fast.");
  }

  const parsed = updateFastingSessionSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const data = parsed.data;
  try {
    const session = await update(userId, data.sessionId, {
      startedAt: new Date(data.startedAt),
      endedAt: data.endedAt ? new Date(data.endedAt) : null,
      plannedDurationMin: data.plannedDurationMin,
      protocolLabel: data.protocolLabel,
      notes: data.notes,
    });
    logger.info("fasting.update.ok", { event: "fasting_update_ok" });
    return ok({ session });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    if (e instanceof FastingOverlapError) return err(OVERLAP_MESSAGE);
    if (e instanceof FastingRangeError) return err(RANGE_MESSAGE);
    logger.error("fasting.update.failed", { event: "fasting_update_failed" });
    return err("Could not save your changes. Please try again.");
  }
}
