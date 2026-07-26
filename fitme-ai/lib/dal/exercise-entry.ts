import "server-only";
import type {
  ExerciseIntensity,
  ExerciseType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertOwnership } from "@/lib/dal/guards";

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

/** Test helper — soft-delete. */
export async function softDeleteExerciseEntry(
  userId: string,
  id: string,
): Promise<void> {
  const row = await prisma.exerciseEntry.findFirst({
    where: { id, userId, deletedAt: null },
  });
  if (!row) return;
  assertOwnership(row.userId, userId);
  await prisma.exerciseEntry.update({
    where: { id },
    data: { deletedAt: new Date() } satisfies Prisma.ExerciseEntryUpdateInput,
  });
}
