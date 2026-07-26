import "server-only";
import type { MealType, NutritionDataSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CorrectionDiff } from "@/lib/domain/nutrition/corrections";
import type {
  IngredientBreakdownLine,
  ParsedFoodItemDraft,
} from "@/lib/domain/nutrition/parse-types";

export type SaveFoodEntriesInput = {
  userId: string;
  items: ParsedFoodItemDraft[];
  /** Existing audit row from parse (Story 2.10); preferred over creating a stub. */
  aiInteractionId?: string | null;
  /** Provider id when creating a fallback AIInteraction stub. */
  providerId?: string;
  model?: string;
};

export type SavedFoodEntryDto = {
  id: string;
  name: string;
  correctionCount: number;
};

function itemRows(
  breakdown: IngredientBreakdownLine[] | null,
): Prisma.FoodEntryItemCreateWithoutFoodEntryInput[] {
  if (!breakdown) return [];
  return breakdown.map((line) => ({
    ingredientSlug: line.ingredientSlug,
    name: line.name,
    grams: Math.max(0, Math.round(line.grams)),
    proportionPct: line.proportionPct,
    dataSource: line.dataSource as NutritionDataSource,
    energyKcal: line.contribution.energyKcal,
    proteinG: line.contribution.proteinG,
    carbsG: line.contribution.carbsG,
    fatG: line.contribution.fatG,
    fibreG: line.contribution.fibreG,
    sugarG: line.contribution.sugarG,
    sodiumMg: line.contribution.sodiumMg,
  }));
}

/**
 * Persist confirmed meal drafts (FR-9). Creates AIInteraction + UserCorrection
 * rows for AI-origin edits (FR-20 / AD-8). Soft-delete capable via deletedAt.
 */
export async function saveConfirmedFoodEntries(
  input: SaveFoodEntriesInput,
  diffsByDraftId: Map<string, CorrectionDiff[]>,
): Promise<SavedFoodEntryDto[]> {
  const saved: SavedFoodEntryDto[] = [];

  await prisma.$transaction(async (tx) => {
    let sharedInteractionId: string | null = input.aiInteractionId ?? null;

    for (const item of input.items) {
      let foodId: string | null = null;
      if (item.foodSlug) {
        const food = await tx.food.findUnique({
          where: { slug: item.foodSlug },
          select: { id: true },
        });
        foodId = food?.id ?? null;
      }

      const isAi = item.origin === "ai_parse";
      const needsAudit =
        isAi || item.dataSource === "ai_estimated";

      let aiInteractionId: string | null = null;
      if (needsAudit) {
        if (!sharedInteractionId) {
          // Fallback stub when client omitted parse audit id.
          const interaction = await tx.aIInteraction.create({
            data: {
              userId: input.userId,
              providerId: input.providerId ?? "unknown",
              model: input.model ?? null,
              purpose: "food_parse",
              status: "succeeded",
              confidence: item.confidence,
              requestMeta: {
                purpose: "food_parse",
                promptCharLength: 0,
              },
            },
          });
          sharedInteractionId = interaction.id;
        }
        aiInteractionId = sharedInteractionId;
      }

      const entry = await tx.foodEntry.create({
        data: {
          userId: input.userId,
          foodId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          mealType: item.mealType as MealType,
          loggedAt: new Date(item.loggedAt),
          dataSource: item.dataSource as NutritionDataSource,
          confidence: item.confidence,
          energyKcal: item.nutrition.energyKcal,
          proteinG: item.nutrition.proteinG,
          carbsG: item.nutrition.carbsG,
          fatG: item.nutrition.fatG,
          fibreG: item.nutrition.fibreG,
          sugarG: item.nutrition.sugarG,
          sodiumMg: item.nutrition.sodiumMg,
          aiInteractionId,
          items: { create: itemRows(item.breakdown) },
        },
      });

      const diffs = diffsByDraftId.get(item.id) ?? [];
      for (const diff of diffs) {
        await tx.userCorrection.create({
          data: {
            userId: input.userId,
            foodEntryId: entry.id,
            aiInteractionId,
            field: diff.field,
            beforeValue: diff.beforeValue as Prisma.InputJsonValue,
            afterValue: diff.afterValue as Prisma.InputJsonValue,
          },
        });
      }

      saved.push({
        id: entry.id,
        name: entry.name,
        correctionCount: diffs.length,
      });
    }
  });

  return saved;
}

/** Active (non-deleted) entries for a user — used by tests / later dashboard. */
export async function listActiveFoodEntriesForUser(userId: string) {
  return prisma.foodEntry.findMany({
    where: { userId, deletedAt: null },
    orderBy: { loggedAt: "desc" },
    include: {
      items: true,
      corrections: true,
      food: { select: { slug: true } },
    },
  });
}
