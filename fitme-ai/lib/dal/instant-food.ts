import "server-only";
import type { MealType, NutritionDataSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { findFoodBySlugOrAlias } from "@/lib/dal/nutrition";
import { assertOwnership } from "@/lib/dal/guards";
import { scaleMacros } from "@/lib/domain/nutrition/scale";

export type UpsertInstantFoodInput = {
  userId: string;
  clientKey: string;
  foodSlug: string;
  quantity: number;
  unit: string;
  mealType: MealType;
  loggedAt: Date;
};

export type InstantFoodEntryDto = {
  id: string;
  name: string;
  clientKey: string;
  estimatedKcal: number | null;
  created: boolean;
};

/**
 * Idempotent instant-path log from catalog (FR-16 / AD-12).
 * Same userId+clientKey returns the existing row (no duplicate).
 */
export async function upsertInstantFoodEntry(
  input: UpsertInstantFoodInput,
): Promise<InstantFoodEntryDto | null> {
  const existing = await prisma.foodEntry.findUnique({
    where: {
      userId_clientKey: {
        userId: input.userId,
        clientKey: input.clientKey,
      },
    },
  });
  if (existing && existing.deletedAt == null) {
    assertOwnership(existing.userId, input.userId);
    return {
      id: existing.id,
      name: existing.name,
      clientKey: input.clientKey,
      estimatedKcal: existing.energyKcal,
      created: false,
    };
  }

  const food = await findFoodBySlugOrAlias(input.foodSlug);
  if (!food) return null;

  let nutrition = food.nutrition;
  if (input.unit === "g") {
    nutrition = scaleMacros(
      food.nutrition,
      input.quantity / food.defaultServingG,
    );
  } else {
    nutrition = scaleMacros(food.nutrition, input.quantity);
  }

  const foodRow = await prisma.food.findUnique({
    where: { slug: food.slug },
    select: { id: true },
  });

  const data = {
    userId: input.userId,
    foodId: foodRow?.id ?? null,
    name: food.name,
    quantity: input.quantity,
    unit: input.unit,
    mealType: input.mealType,
    loggedAt: input.loggedAt,
    dataSource: "database" as NutritionDataSource,
    confidence: 1,
    energyKcal: nutrition.energyKcal,
    proteinG: nutrition.proteinG,
    carbsG: nutrition.carbsG,
    fatG: nutrition.fatG,
    fibreG: nutrition.fibreG,
    sugarG: nutrition.sugarG,
    sodiumMg: nutrition.sodiumMg,
    clientKey: input.clientKey,
    deletedAt: null as Date | null,
  };

  if (existing) {
    assertOwnership(existing.userId, input.userId);
    const row = await prisma.foodEntry.update({
      where: { id: existing.id },
      data,
    });
    return {
      id: row.id,
      name: row.name,
      clientKey: input.clientKey,
      estimatedKcal: row.energyKcal,
      created: true,
    };
  }

  const row = await prisma.foodEntry.create({ data });

  return {
    id: row.id,
    name: row.name,
    clientKey: input.clientKey,
    estimatedKcal: row.energyKcal,
    created: true,
  };
}
