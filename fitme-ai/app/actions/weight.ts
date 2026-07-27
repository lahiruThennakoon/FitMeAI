"use server";

import { requireSession } from "@/lib/dal";
import {
  createWeightEntry,
  type CreateWeightEntryInput,
  type WeightEntryDto,
} from "@/lib/dal/weight-entry";
import { fieldErrorsFromZod } from "@/lib/auth/actions-shared";
import { logger } from "@/lib/logging";
import { err, ok, type Result } from "@/lib/result";
import { saveWeightEntrySchema } from "@/lib/schemas/weight";

export type SaveWeightResult = Result<{ entry: WeightEntryDto }>;

export type SaveWeightActionDeps = {
  requireSession?: typeof requireSession;
  createWeightEntry?: typeof createWeightEntry;
};

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
