"use server";

import { requireSession } from "@/lib/dal";
import { upsertInstantFoodEntry } from "@/lib/dal/instant-food";
import { fieldErrorsFromZod } from "@/lib/auth/actions-shared";
import { logger } from "@/lib/logging";
import { err, ok, type Result } from "@/lib/result";
import {
  instantFoodSchema,
  reconcileOfflineQueueSchema,
} from "@/lib/schemas/offline";
import type { MealType } from "@prisma/client";

export type InstantFoodResult = Result<{
  id: string;
  name: string;
  clientKey: string;
  created: boolean;
}>;

export type ReconcileResult = Result<{
  saved: number;
  skipped: number;
  failed: Array<{
    clientKey: string;
    foodSlug: string;
    reason: "not_in_catalog" | "error";
  }>;
}>;

/**
 * Instant-path catalog log — no AI (FR-16). Idempotent via clientKey.
 */
export async function saveInstantFoodAction(
  input: unknown,
): Promise<InstantFoodResult> {
  let userId: string;
  try {
    userId = (await requireSession()).id;
  } catch {
    return err("Please sign in to log food.");
  }

  const parsed = instantFoodSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const data = parsed.data;
  try {
    const entry = await upsertInstantFoodEntry({
      userId,
      clientKey: data.clientKey,
      foodSlug: data.foodSlug,
      quantity: data.quantity,
      unit: data.unit,
      mealType: (data.mealType ?? "unknown") as MealType,
      loggedAt: data.loggedAt ? new Date(data.loggedAt) : new Date(),
    });
    if (!entry) {
      return err("That food isn’t in your offline cache. Try again online.");
    }
    logger.info("offline.instant.ok", {
      event: "instant_food_ok",
      created: entry.created,
    });
    return ok({
      id: entry.id,
      name: entry.name,
      clientKey: entry.clientKey,
      created: entry.created,
    });
  } catch {
    logger.error("offline.instant.failed", { event: "instant_food_failed" });
    return err("Could not save that food. Please try again.");
  }
}

/**
 * Reconcile queued offline writes — idempotent upserts (AD-12).
 */
export async function reconcileOfflineQueueAction(
  input: unknown,
): Promise<ReconcileResult> {
  let userId: string;
  try {
    userId = (await requireSession()).id;
  } catch {
    return err("Please sign in to sync offline logs.");
  }

  const parsed = reconcileOfflineQueueSchema.safeParse(input);
  if (!parsed.success) {
    return err("Could not sync offline queue.");
  }

  let saved = 0;
  let skipped = 0;
  const failed: Array<{
    clientKey: string;
    foodSlug: string;
    reason: "not_in_catalog" | "error";
  }> = [];
  for (const item of parsed.data.items) {
    try {
      const entry = await upsertInstantFoodEntry({
        userId,
        clientKey: item.clientKey,
        foodSlug: item.foodSlug,
        quantity: item.quantity,
        unit: item.unit,
        mealType: (item.mealType ?? "unknown") as MealType,
        loggedAt: new Date(item.loggedAt),
      });
      if (!entry) {
        skipped += 1;
        failed.push({
          clientKey: item.clientKey,
          foodSlug: item.foodSlug,
          reason: "not_in_catalog",
        });
        continue;
      }
      if (entry.created) saved += 1;
      else skipped += 1;
    } catch {
      skipped += 1;
      failed.push({
        clientKey: item.clientKey,
        foodSlug: item.foodSlug,
        reason: "error",
      });
    }
  }

  logger.info("offline.reconcile.ok", {
    event: "offline_reconcile_ok",
    saved,
    skipped,
    failed: failed.length,
  });
  return ok({ saved, skipped, failed });
}
