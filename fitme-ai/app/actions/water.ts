"use server";

import { requireSession } from "@/lib/dal";
import {
  createWaterEntry,
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

export type SaveWaterActionDeps = {
  requireSession?: typeof requireSession;
  createWaterEntry?: typeof createWaterEntry;
};

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
