"use server";

import { requireSession } from "@/lib/dal";
import { findFoodBySlugOrAlias, searchFoodsByQuery, type FoodSearchHit } from "@/lib/dal/nutrition";
import { foodEntryToDraft } from "@/lib/domain/nutrition/food-template-draft";
import type { ParsedFoodItemDraft } from "@/lib/domain/nutrition/parse-types";
import { err, ok, type Result } from "@/lib/result";
import { z } from "zod";

export type SearchFoodCatalogResult = Result<{ hits: FoodSearchHit[] }>;
export type LoadCatalogFoodDraftResult = Result<ParsedFoodItemDraft>;

const searchSchema = z.object({
  query: z.string().trim().min(2).max(80),
  limit: z.number().int().min(1).max(24).optional(),
});

const slugSchema = z.object({
  slug: z.string().trim().min(1).max(80),
});

export type CatalogActionDeps = {
  requireSession?: typeof requireSession;
  searchFoodsByQuery?: typeof searchFoodsByQuery;
  findFoodBySlugOrAlias?: typeof findFoodBySlugOrAlias;
};

/** Online catalog lookup for Log (Tier 3). */
export async function searchFoodCatalogAction(
  input: unknown,
  deps: CatalogActionDeps = {},
): Promise<SearchFoodCatalogResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const search = deps.searchFoodsByQuery ?? searchFoodsByQuery;

  try {
    await requireSessionFn();
  } catch {
    return err("Please sign in to search foods.");
  }

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) {
    return err("Enter at least two characters to search.");
  }

  const hits = await search(parsed.data.query, parsed.data.limit ?? 12);
  return ok({ hits });
}

/** Load a catalog food into the review editor (Tier 3). */
export async function loadCatalogFoodDraftAction(
  input: unknown,
  deps: CatalogActionDeps = {},
): Promise<LoadCatalogFoodDraftResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const findFood = deps.findFoodBySlugOrAlias ?? findFoodBySlugOrAlias;

  try {
    await requireSessionFn();
  } catch {
    return err("Please sign in to load that food.");
  }

  const parsed = slugSchema.safeParse(input);
  if (!parsed.success) {
    return err("Could not load that food.");
  }

  const food = await findFood(parsed.data.slug);
  if (!food) {
    return err("That food isn't in the catalog.");
  }

  return ok(
    foodEntryToDraft(
      {
        id: food.slug,
        name: food.name,
        quantity: 1,
        unit: "serving",
        mealType: "unknown",
        dataSource: "database",
        confidence: 1,
        energyKcal: food.nutrition.energyKcal,
        proteinG: food.nutrition.proteinG,
        carbsG: food.nutrition.carbsG,
        fatG: food.nutrition.fatG,
        fibreG: food.nutrition.fibreG,
        sugarG: food.nutrition.sugarG,
        sodiumMg: food.nutrition.sodiumMg,
        foodSlug: food.slug,
      },
      {
        foodSlug: food.slug,
        kind: food.kind,
        catalog: {
          defaultServingG: food.defaultServingG,
          nutritionAtDefault: food.nutrition,
          servings: food.servings,
        },
      },
    ),
  );
}
