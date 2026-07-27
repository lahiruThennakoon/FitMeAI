import "server-only";
import type {
  ExerciseIntensity,
  ExerciseType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertOwnership, requireOwnedResource } from "@/lib/dal/guards";

export type CreateExerciseEntryInput = {
  userId: string;
  type: ExerciseType;
  customLabel?: string | null;
  durationMin: number;
  intensity: ExerciseIntensity;
  distanceM?: number | null;
  sets?: number | null;
  reps?: number | null;
  weightG?: number | null;
  notes?: string | null;
  estimatedKcal: number;
  metUsed: number;
  weightKgUsed: number;
  performedAt: Date;
};

export type ExerciseEntryDto = {
  id: string;
  type: ExerciseType;
  customLabel: string | null;
  durationMin: number;
  intensity: ExerciseIntensity;
  estimatedKcal: number;
  performedAt: string;
  displayName: string;
};

/** Lean edit DTO for Home list/edit (Story 5.3) — same shape as list DTO. */
export type ExerciseEntryEditableDto = ExerciseEntryDto;

export type UpdateExerciseEntryInput = {
  type: ExerciseType;
  customLabel?: string | null;
  durationMin: number;
  intensity: ExerciseIntensity;
  estimatedKcal: number;
  metUsed: number;
  weightKgUsed: number;
};

type EditableExerciseEntryRow = {
  id: string;
  userId: string;
  type: ExerciseType;
  customLabel: string | null;
  durationMin: number;
  intensity: ExerciseIntensity;
  estimatedKcal: number;
  performedAt: Date;
};

function toDto(row: {
  id: string;
  type: ExerciseType;
  customLabel: string | null;
  durationMin: number;
  intensity: ExerciseIntensity;
  estimatedKcal: number;
  performedAt: Date;
}): ExerciseEntryDto {
  const displayName =
    row.type === "custom"
      ? (row.customLabel?.trim() || "Custom")
      : row.type.charAt(0).toUpperCase() + row.type.slice(1);
  return {
    id: row.id,
    type: row.type,
    customLabel: row.customLabel,
    durationMin: row.durationMin,
    intensity: row.intensity,
    estimatedKcal: row.estimatedKcal,
    performedAt: row.performedAt.toISOString(),
    displayName,
  };
}

async function findOwnedExerciseEntry(
  userId: string,
  id: string,
): Promise<EditableExerciseEntryRow> {
  const row = await prisma.exerciseEntry.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      userId: true,
      type: true,
      customLabel: true,
      durationMin: true,
      intensity: true,
      estimatedKcal: true,
      performedAt: true,
    },
  });
  return requireOwnedResource(row, userId);
}

export async function createExerciseEntry(
  input: CreateExerciseEntryInput,
): Promise<ExerciseEntryDto> {
  const row = await prisma.exerciseEntry.create({
    data: {
      userId: input.userId,
      type: input.type,
      customLabel: input.customLabel ?? null,
      durationMin: input.durationMin,
      intensity: input.intensity,
      distanceM: input.distanceM ?? null,
      sets: input.sets ?? null,
      reps: input.reps ?? null,
      weightG: input.weightG ?? null,
      notes: input.notes ?? null,
      estimatedKcal: input.estimatedKcal,
      metUsed: input.metUsed,
      weightKgUsed: input.weightKgUsed,
      performedAt: input.performedAt,
    },
  });
  assertOwnership(row.userId, input.userId);
  return toDto(row);
}

/** Active (non-deleted) exercise entries for a user, newest first. */
export async function listActiveExerciseEntriesForUser(userId: string) {
  const rows = await prisma.exerciseEntry.findMany({
    where: { userId, deletedAt: null },
    orderBy: { performedAt: "desc" },
  });
  return rows.map(toDto);
}

export async function sumExerciseKcalForUserBetween(
  userId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const agg = await prisma.exerciseEntry.aggregate({
    where: {
      userId,
      deletedAt: null,
      performedAt: { gte: from, lt: to },
    },
    _sum: { estimatedKcal: true },
  });
  return agg._sum.estimatedKcal ?? 0;
}

/** Fetch a single owned, active entry for populating an edit form. */
export async function getEditableExerciseEntry(
  userId: string,
  id: string,
): Promise<ExerciseEntryEditableDto> {
  const row = await findOwnedExerciseEntry(userId, id);
  return toDto(row);
}

/**
 * Update type/duration/intensity (+ estimate columns) on an owned entry
 * (Story 5.3). Caller must recompute burn via `estimateExerciseBurn` first.
 */
export async function updateExerciseEntry(
  userId: string,
  id: string,
  patch: UpdateExerciseEntryInput,
): Promise<ExerciseEntryEditableDto> {
  await findOwnedExerciseEntry(userId, id);
  const row = await prisma.exerciseEntry.update({
    where: { id },
    data: {
      type: patch.type,
      customLabel: patch.customLabel ?? null,
      durationMin: patch.durationMin,
      intensity: patch.intensity,
      estimatedKcal: patch.estimatedKcal,
      metUsed: patch.metUsed,
      weightKgUsed: patch.weightKgUsed,
    } satisfies Prisma.ExerciseEntryUpdateInput,
  });
  return toDto(row);
}

/** Soft-delete an owned, active entry (Story 5.3 AC3). */
export async function softDeleteExerciseEntry(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await findOwnedExerciseEntry(userId, id);
  await prisma.exerciseEntry.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() } satisfies Prisma.ExerciseEntryUpdateInput,
  });
}
