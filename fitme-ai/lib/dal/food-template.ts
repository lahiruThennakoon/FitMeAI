import "server-only";
import type { MealType, NutritionDataSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwnedResource } from "@/lib/dal/guards";

export type FoodTemplateDto = {
  sourceEntryId: string;
  name: string;
  quantity: number;
  unit: string;
  mealType: MealType;
  energyKcal: number | null;
  dataSource: NutritionDataSource;
  foodSlug: string | null;
  isFavorite: boolean;
};

type TemplateRow = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  mealType: MealType;
  energyKcal: number | null;
  dataSource: NutritionDataSource;
  isFavorite: boolean;
  foodId: string | null;
  food: { slug: string } | null;
};

const templateSelect = {
  id: true,
  name: true,
  quantity: true,
  unit: true,
  mealType: true,
  energyKcal: true,
  dataSource: true,
  isFavorite: true,
  foodId: true,
  food: { select: { slug: true } },
} satisfies Prisma.FoodEntrySelect;

function toDto(row: TemplateRow): FoodTemplateDto {
  return {
    sourceEntryId: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    mealType: row.mealType,
    energyKcal: row.energyKcal,
    dataSource: row.dataSource,
    foodSlug: row.food?.slug ?? null,
    isFavorite: row.isFavorite,
  };
}

function dedupeKey(row: TemplateRow): string {
  return row.foodId ?? `name:${row.name.trim().toLowerCase()}`;
}

function dedupeTemplates(rows: TemplateRow[], limit: number): FoodTemplateDto[] {
  const seen = new Set<string>();
  const out: FoodTemplateDto[] = [];
  for (const row of rows) {
    const key = dedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(toDto(row));
    if (out.length >= limit) break;
  }
  return out;
}

/** Distinct recent meals for Log one-tap re-log (Story 5.5). */
export async function listRecentFoodTemplates(
  userId: string,
  limit = 24,
): Promise<FoodTemplateDto[]> {
  const rows = await prisma.foodEntry.findMany({
    where: { userId, deletedAt: null },
    orderBy: { loggedAt: "desc" },
    take: Math.max(limit * 5, 40),
    select: templateSelect,
  });
  return dedupeTemplates(rows, limit);
}

/** Favorited meals for Log (Story 5.5). */
export async function listFavoriteFoodTemplates(
  userId: string,
  limit = 40,
): Promise<FoodTemplateDto[]> {
  const rows = await prisma.foodEntry.findMany({
    where: { userId, deletedAt: null, isFavorite: true },
    orderBy: { updatedAt: "desc" },
    take: Math.max(limit * 3, 24),
    select: templateSelect,
  });
  return dedupeTemplates(rows, limit);
}

/** Pin / unpin a food entry for favorites. */
export async function setFoodEntryFavorite(
  userId: string,
  id: string,
  isFavorite: boolean,
): Promise<FoodTemplateDto> {
  const row = await prisma.foodEntry.findFirst({
    where: { id, deletedAt: null },
    select: { ...templateSelect, userId: true },
  });
  const owned = requireOwnedResource(row, userId);
  const updated = await prisma.foodEntry.update({
    where: { id: owned.id },
    data: { isFavorite },
    select: templateSelect,
  });
  return toDto(updated);
}

const draftSourceSelect = {
  id: true,
  userId: true,
  name: true,
  quantity: true,
  unit: true,
  mealType: true,
  dataSource: true,
  confidence: true,
  energyKcal: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
  fibreG: true,
  sugarG: true,
  sodiumMg: true,
  food: { select: { slug: true } },
} satisfies Prisma.FoodEntrySelect;

/** Full entry row for edit-before-save re-log (Story 5.5). */
export async function getFoodEntryForDraft(
  userId: string,
  sourceEntryId: string,
) {
  const row = await prisma.foodEntry.findFirst({
    where: { id: sourceEntryId, deletedAt: null },
    select: draftSourceSelect,
  });
  const owned = requireOwnedResource(row, userId);
  return {
    id: owned.id,
    name: owned.name,
    quantity: owned.quantity,
    unit: owned.unit,
    mealType: owned.mealType,
    dataSource: owned.dataSource,
    confidence: owned.confidence,
    energyKcal: owned.energyKcal,
    proteinG: owned.proteinG,
    carbsG: owned.carbsG,
    fatG: owned.fatG,
    fibreG: owned.fibreG,
    sugarG: owned.sugarG,
    sodiumMg: owned.sodiumMg,
    foodSlug: owned.food?.slug ?? null,
  };
}

/**
 * Every meal logged on one calendar day, oldest first, in draft shape.
 * Backs "copy a past day" — the caller shifts the times and reviews before save.
 */
export async function listFoodEntryDraftsForRange(
  userId: string,
  start: Date,
  end: Date,
  limit = 20,
) {
  const rows = await prisma.foodEntry.findMany({
    where: {
      userId,
      deletedAt: null,
      loggedAt: { gte: start, lt: end },
    },
    orderBy: { loggedAt: "asc" },
    take: limit,
    select: { ...draftSourceSelect, loggedAt: true },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    mealType: row.mealType,
    dataSource: row.dataSource,
    confidence: row.confidence,
    energyKcal: row.energyKcal,
    proteinG: row.proteinG,
    carbsG: row.carbsG,
    fatG: row.fatG,
    fibreG: row.fibreG,
    sugarG: row.sugarG,
    sodiumMg: row.sodiumMg,
    foodSlug: row.food?.slug ?? null,
    loggedAt: row.loggedAt,
  }));
}

export type ReloggedFoodEntryDto = {
  id: string;
  name: string;
  energyKcal: number | null;
};

const relogSourceSelect = {
  userId: true,
  foodId: true,
  name: true,
  quantity: true,
  unit: true,
  mealType: true,
  dataSource: true,
  confidence: true,
  energyKcal: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
  fibreG: true,
  sugarG: true,
  sodiumMg: true,
  note: true,
} satisfies Prisma.FoodEntrySelect;

/**
 * Duplicate a past meal with a fresh timestamp — one-tap re-log (Tier 3).
 * Does not copy favorite status or client keys.
 */
export async function relogFoodEntryNow(
  userId: string,
  sourceEntryId: string,
  loggedAt: Date = new Date(),
): Promise<ReloggedFoodEntryDto> {
  const row = await prisma.foodEntry.findFirst({
    where: { id: sourceEntryId, deletedAt: null },
    select: relogSourceSelect,
  });
  const owned = requireOwnedResource(row, userId);

  let aiInteractionId: string | null = null;
  if (owned.dataSource === "ai_estimated") {
    const interaction = await prisma.aIInteraction.create({
      data: {
        userId,
        providerId: "relog",
        model: null,
        purpose: "food_parse",
        status: "succeeded",
        confidence: owned.confidence,
        requestMeta: { purpose: "food_parse", promptCharLength: 0 },
      },
    });
    aiInteractionId = interaction.id;
  }

  const created = await prisma.foodEntry.create({
    data: {
      userId,
      foodId: owned.foodId,
      name: owned.name,
      quantity: owned.quantity,
      unit: owned.unit,
      mealType: owned.mealType,
      loggedAt,
      dataSource: owned.dataSource,
      confidence: owned.confidence,
      energyKcal: owned.energyKcal,
      proteinG: owned.proteinG,
      carbsG: owned.carbsG,
      fatG: owned.fatG,
      fibreG: owned.fibreG,
      sugarG: owned.sugarG,
      sodiumMg: owned.sodiumMg,
      note: owned.note,
      aiInteractionId,
    },
    select: { id: true, name: true, energyKcal: true },
  });

  return created;
}

