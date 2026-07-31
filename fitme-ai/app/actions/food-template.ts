"use server";

import { requireSession } from "@/lib/dal";
import { findFoodBySlugOrAlias } from "@/lib/dal/nutrition";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";
import {
  getFoodEntryForDraft,
  relogFoodEntryNow,
  setFoodEntryFavorite,
  type FoodTemplateDto,
  type ReloggedFoodEntryDto,
} from "@/lib/dal/food-template";
import { foodEntryToDraft } from "@/lib/domain/nutrition/food-template-draft";
import type { ParsedFoodItemDraft } from "@/lib/domain/nutrition/parse-types";
import { logger } from "@/lib/logging";
import { err, ok, type Result } from "@/lib/result";
import { z } from "zod";

export type FavoriteFoodResult = Result<{ entry: FoodTemplateDto }>;
export type LoadFoodTemplateDraftResult = Result<ParsedFoodItemDraft>;
export type RelogFoodTemplateResult = Result<{ entry: ReloggedFoodEntryDto }>;

export type FoodTemplateActionDeps = {
  requireSession?: typeof requireSession;
  setFoodEntryFavorite?: typeof setFoodEntryFavorite;
  getFoodEntryForDraft?: typeof getFoodEntryForDraft;
  findFoodBySlugOrAlias?: typeof findFoodBySlugOrAlias;
  relogFoodEntryNow?: typeof relogFoodEntryNow;
  now?: () => Date;
};

const NOT_FOUND_MESSAGE =
  "That meal wasn't found — it may already be removed.";

const favoriteSchema = z.object({
  id: z.string().min(1),
  isFavorite: z.boolean(),
});

const loadDraftSchema = z.object({
  sourceEntryId: z.string().min(1),
});

/** Load a past meal into the review editor without saving (Story 5.5). */
export async function loadFoodTemplateDraftAction(
  input: unknown,
  deps: FoodTemplateActionDeps = {},
): Promise<LoadFoodTemplateDraftResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const getEntry = deps.getFoodEntryForDraft ?? getFoodEntryForDraft;
  const findFood = deps.findFoodBySlugOrAlias ?? findFoodBySlugOrAlias;

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to log food.");
  }

  const parsed = loadDraftSchema.safeParse(input);
  if (!parsed.success) {
    return err("Could not load that meal.");
  }

  try {
    const row = await getEntry(userId, parsed.data.sourceEntryId);
    const slug = row.foodSlug;
    if (slug) {
      const food = await findFood(slug);
      if (food) {
        return ok(
          foodEntryToDraft(row, {
            foodSlug: food.slug,
            kind: food.kind,
            catalog: {
              defaultServingG: food.defaultServingG,
              nutritionAtDefault: food.nutrition,
              servings: food.servings,
            },
          }),
        );
      }
    }
    return ok(foodEntryToDraft(row));
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("food_template.load_draft.failed", {
      event: "food_load_draft_failed",
    });
    return err("Could not load that meal. Please try again.");
  }
}

/** One-tap re-log a past meal at the current time (Tier 3). */
export async function relogFoodTemplateAction(
  input: unknown,
  deps: FoodTemplateActionDeps = {},
): Promise<RelogFoodTemplateResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const relog = deps.relogFoodEntryNow ?? relogFoodEntryNow;
  const now = deps.now?.() ?? new Date();

  let userId: string;
  try {
    userId = (await requireSessionFn()).id;
  } catch {
    return err("Please sign in to log food.");
  }

  const parsed = loadDraftSchema.safeParse(input);
  if (!parsed.success) {
    return err("Could not log that meal.");
  }

  try {
    const entry = await relog(userId, parsed.data.sourceEntryId, now);
    logger.info("food_template.relog.ok", { event: "food_relog_ok" });
    return ok({ entry });
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof UnauthorizedError) {
      return err(NOT_FOUND_MESSAGE);
    }
    logger.error("food_template.relog.failed", { event: "food_relog_failed" });
    return err("Could not log that meal. Please try again.");
  }
}

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
