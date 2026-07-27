"use server";

import { requireSession } from "@/lib/dal";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";
import {
  relogFromFoodEntry,
  setFoodEntryFavorite,
  type FoodTemplateDto,
} from "@/lib/dal/food-template";
import { logger } from "@/lib/logging";
import { err, ok, type Result } from "@/lib/result";
import { z } from "zod";

export type FavoriteFoodResult = Result<{ entry: FoodTemplateDto }>;
export type RelogFoodResult = Result<{
  id: string;
  name: string;
  energyKcal: number | null;
  source: "recent" | "favorite";
}>;

export type FoodTemplateActionDeps = {
  requireSession?: typeof requireSession;
  setFoodEntryFavorite?: typeof setFoodEntryFavorite;
  relogFromFoodEntry?: typeof relogFromFoodEntry;
};

const NOT_FOUND_MESSAGE =
  "That meal wasn't found — it may already be removed.";

const favoriteSchema = z.object({
  id: z.string().min(1),
  isFavorite: z.boolean(),
});

const relogSchema = z.object({
  sourceEntryId: z.string().min(1),
  source: z.enum(["recent", "favorite"]),
  clientKey: z.string().min(8).max(80).optional().nullable(),
});

/** Pin / unpin a meal for favorites on Log (Story 5.5). */
export async function setFavoriteFoodAction(
  input: unknown,
  deps: FoodTemplateActionDeps = {},
): Promise<FavoriteFoodResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const setFavorite = deps.setFoodEntryFavorite ?? setFoodEntryFavorite;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to update favorites.");
  }

  const parsed = favoriteSchema.safeParse(input);
  if (!parsed.success) {
    return err("Could not update that favorite.");
  }

  try {
    const entry = await setFavorite(
      userId,
      parsed.data.id,
      parsed.data.isFavorite,
    );
    logger.info("food_template.favorite.ok", {
      event: "food_favorite_ok",
      isFavorite: parsed.data.isFavorite,
    });
    return ok({ entry });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("food_template.favorite.failed", {
      event: "food_favorite_failed",
    });
    return err("Could not update that favorite. Please try again.");
  }
}

/**
 * Re-log a past meal as a new entry for now (Story 5.5).
 * Catalog items with a slug should prefer the instant path from the client.
 */
export async function relogFoodTemplateAction(
  input: unknown,
  deps: FoodTemplateActionDeps = {},
): Promise<RelogFoodResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const relog = deps.relogFromFoodEntry ?? relogFromFoodEntry;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to log food.");
  }

  const parsed = relogSchema.safeParse(input);
  if (!parsed.success) {
    return err("Could not re-log that meal.");
  }

  try {
    const entry = await relog(
      userId,
      parsed.data.sourceEntryId,
      parsed.data.clientKey,
    );
    logger.info("food_template.relog.ok", {
      event: "food_relog_ok",
      source: parsed.data.source,
    });
    return ok({
      id: entry.id,
      name: entry.name,
      energyKcal: entry.energyKcal,
      source: parsed.data.source,
    });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("food_template.relog.failed", {
      event: "food_relog_failed",
    });
    return err("Could not re-log that meal. Please try again.");
  }
}
