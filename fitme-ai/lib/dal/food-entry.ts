import "server-only";
import type { MealType, NutritionDataSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwnedResource } from "@/lib/dal/guards";
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
    const parseInteractionId = input.aiInteractionId ?? null;
    /**
     * Drafts that need an audit row but did not come from this parse (manual
     * entries, re-logged templates) must not borrow the parse's audit id.
     */
    let stubInteractionId: string | null = null;

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
        if (isAi && parseInteractionId) {
          aiInteractionId = parseInteractionId;
        } else {
          if (!stubInteractionId) {
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
            stubInteractionId = interaction.id;
          }
          aiInteractionId = stubInteractionId;
        }
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
          note: item.note?.trim() || null,
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

/** Whether the user has ever logged a meal (active entries only). */
export async function hasAnyFoodEntriesForUser(userId: string): Promise<boolean> {
  const row = await prisma.foodEntry.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  return row != null;
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

// ---------------------------------------------------------------------------
// Edit / soft-delete logged meals (Story 5.2 / FR-9 correction path).
// The ingredient `items` breakdown (composite dishes) is not editable here.
// ---------------------------------------------------------------------------

export type FoodEntryEditableDto = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  mealType: MealType;
  loggedAt: string;
  energyKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fibreG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  note: string | null;
  /** True when this entry has an AI audit trail (edits get logged as UserCorrection). */
  isAiOrigin: boolean;
};

export type UpdateFoodEntryInput = {
  name: string;
  quantity: number;
  unit: string;
  mealType: MealType;
  loggedAt: Date;
  energyKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fibreG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  note: string | null;
};

type EditableFoodEntryRow = {
  id: string;
  userId: string;
  name: string;
  quantity: number;
  unit: string;
  mealType: MealType;
  loggedAt: Date;
  energyKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fibreG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  note: string | null;
  aiInteractionId: string | null;
};

function toEditableDto(row: EditableFoodEntryRow): FoodEntryEditableDto {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    mealType: row.mealType,
    loggedAt: row.loggedAt.toISOString(),
    energyKcal: row.energyKcal,
    proteinG: row.proteinG,
    carbsG: row.carbsG,
    fatG: row.fatG,
    fibreG: row.fibreG,
    sugarG: row.sugarG,
    sodiumMg: row.sodiumMg,
    note: row.note,
    isAiOrigin: row.aiInteractionId != null,
  };
}

function editableValuesEqual(
  a: string | number | null,
  b: string | number | null,
): boolean {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 1e-9;
  }
  return false;
}

/** Diff editable fields for the FR-20 UserCorrection audit trail. */
function diffEditableFields(
  before: EditableFoodEntryRow,
  after: UpdateFoodEntryInput,
): CorrectionDiff[] {
  const pairs: Array<{
    field: string;
    before: string | number | null;
    after: string | number | null;
  }> = [
    { field: "name", before: before.name, after: after.name },
    { field: "quantity", before: before.quantity, after: after.quantity },
    { field: "unit", before: before.unit, after: after.unit },
    { field: "mealType", before: before.mealType, after: after.mealType },
    {
      field: "loggedAt",
      before: before.loggedAt.toISOString(),
      after: after.loggedAt.toISOString(),
    },
    { field: "energyKcal", before: before.energyKcal, after: after.energyKcal },
    { field: "proteinG", before: before.proteinG, after: after.proteinG },
    { field: "carbsG", before: before.carbsG, after: after.carbsG },
    { field: "fatG", before: before.fatG, after: after.fatG },
    { field: "fibreG", before: before.fibreG, after: after.fibreG },
    { field: "sugarG", before: before.sugarG, after: after.sugarG },
    { field: "sodiumMg", before: before.sodiumMg, after: after.sodiumMg },
    { field: "note", before: before.note, after: after.note },
  ];
  return pairs
    .filter((p) => !editableValuesEqual(p.before, p.after))
    .map((p) => ({ field: p.field, beforeValue: p.before, afterValue: p.after }));
}

async function findOwnedFoodEntry(
  userId: string,
  id: string,
): Promise<EditableFoodEntryRow> {
  const row = await prisma.foodEntry.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      userId: true,
      name: true,
      quantity: true,
      unit: true,
      mealType: true,
      loggedAt: true,
      energyKcal: true,
      proteinG: true,
      carbsG: true,
      fatG: true,
      fibreG: true,
      sugarG: true,
      sodiumMg: true,
      note: true,
      aiInteractionId: true,
    },
  });
  return requireOwnedResource(row, userId);
}

/** Fetch a single owned, active entry for populating an edit form. */
export async function getEditableFoodEntry(
  userId: string,
  id: string,
): Promise<FoodEntryEditableDto> {
  const row = await findOwnedFoodEntry(userId, id);
  return toEditableDto(row);
}

/**
 * Edit name/quantity/macros on an owned, active entry (Story 5.2 AC1).
 * Logs UserCorrection rows for AI-origin entries when fields actually change
 * (FR-20 audit trail) — same shape as the save-time correction diff.
 */
export async function updateFoodEntry(
  userId: string,
  id: string,
  patch: UpdateFoodEntryInput,
): Promise<FoodEntryEditableDto> {
  const existing = await findOwnedFoodEntry(userId, id);
  const diffs = diffEditableFields(existing, patch);

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.foodEntry.update({
      where: { id },
      data: {
        name: patch.name,
        quantity: patch.quantity,
        unit: patch.unit,
        mealType: patch.mealType,
        loggedAt: patch.loggedAt,
        energyKcal: patch.energyKcal,
        proteinG: patch.proteinG,
        carbsG: patch.carbsG,
        fatG: patch.fatG,
        fibreG: patch.fibreG,
        sugarG: patch.sugarG,
        sodiumMg: patch.sodiumMg,
        note: patch.note,
      },
    });

    if (existing.aiInteractionId && diffs.length > 0) {
      for (const diff of diffs) {
        await tx.userCorrection.create({
          data: {
            userId,
            foodEntryId: id,
            aiInteractionId: existing.aiInteractionId,
            field: diff.field,
            beforeValue: diff.beforeValue as Prisma.InputJsonValue,
            afterValue: diff.afterValue as Prisma.InputJsonValue,
          },
        });
      }
    }

    return row;
  });

  return toEditableDto({ ...updated, aiInteractionId: existing.aiInteractionId });
}

/** Soft-delete an owned, active entry (Story 5.2 AC2). */
export async function softDeleteFoodEntry(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await findOwnedFoodEntry(userId, id);
  await prisma.foodEntry.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() } satisfies Prisma.FoodEntryUpdateInput,
  });
}

/** Restore a soft-deleted entry (undo path). */
export async function restoreFoodEntry(
  userId: string,
  id: string,
): Promise<void> {
  const row = await prisma.foodEntry.findFirst({
    where: { id, deletedAt: { not: null } },
    select: { id: true, userId: true },
  });
  const owned = requireOwnedResource(row, userId);
  await prisma.foodEntry.update({
    where: { id: owned.id },
    data: { deletedAt: null } satisfies Prisma.FoodEntryUpdateInput,
  });
}
