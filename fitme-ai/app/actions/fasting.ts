"use server";

import { requireSession } from "@/lib/dal";
import {
  ActiveFastExistsError,
  endFastingSession,
  startFastingSession,
  type FastingSessionDto,
} from "@/lib/dal/fasting-session";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";
import { fieldErrorsFromZod } from "@/lib/auth/actions-shared";
import { logger } from "@/lib/logging";
import { err, ok, type Result } from "@/lib/result";
import {
  endFastingSessionSchema,
  startFastingSessionSchema,
} from "@/lib/schemas/fasting";

export type FastingActionResult = Result<{ session: FastingSessionDto }>;

export type FastingActionDeps = {
  requireSession?: typeof requireSession;
  startFastingSession?: typeof startFastingSession;
  endFastingSession?: typeof endFastingSession;
};

const NOT_FOUND_MESSAGE =
  "That fasting session wasn't found — it may already be ended.";

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
