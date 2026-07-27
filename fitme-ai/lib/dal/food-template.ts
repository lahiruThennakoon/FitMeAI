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
  limit = 8,
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
  limit = 12,
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

export type RelogFoodEntryResult = {
  id: string;
  name: string;
  energyKcal: number | null;
  created: boolean;
};

/**
 * Clone an owned entry into a new log for "now" (Story 5.5).
 * Copies nutrition provenance — does not invent a new AI estimate.
 */
export async function relogFromFoodEntry(
  userId: string,
  sourceEntryId: string,
  clientKey?: string | null,
): Promise<RelogFoodEntryResult> {
  const source = await prisma.foodEntry.findFirst({
    where: { id: sourceEntryId, deletedAt: null },
    select: {
      id: true,
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
    },
  });
  const owned = requireOwnedResource(source, userId);

  if (clientKey) {
    const existing = await prisma.foodEntry.findUnique({
      where: { userId_clientKey: { userId, clientKey } },
    });
    if (existing && existing.deletedAt == null) {
      return {
        id: existing.id,
        name: existing.name,
        energyKcal: existing.energyKcal,
        created: false,
      };
    }
  }

  const row = await prisma.foodEntry.create({
    data: {
      userId,
      foodId: owned.foodId,
      name: owned.name,
      quantity: owned.quantity,
      unit: owned.unit,
      mealType: owned.mealType,
      loggedAt: new Date(),
      dataSource: owned.dataSource,
      confidence: owned.confidence,
      energyKcal: owned.energyKcal,
      proteinG: owned.proteinG,
      carbsG: owned.carbsG,
      fatG: owned.fatG,
      fibreG: owned.fibreG,
      sugarG: owned.sugarG,
      sodiumMg: owned.sodiumMg,
      clientKey: clientKey ?? null,
      isFavorite: false,
      aiInteractionId: null,
    },
  });

  return {
    id: row.id,
    name: row.name,
    energyKcal: row.energyKcal,
    created: true,
  };
}
