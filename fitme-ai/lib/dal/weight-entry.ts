import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertOwnership } from "@/lib/dal/guards";

export type CreateWeightEntryInput = {
  userId: string;
  weightG: number;
  recordedAt: Date;
  note?: string | null;
};

export type WeightEntryDto = {
  id: string;
  weightG: number;
  recordedAt: string;
  note: string | null;
};

function toDto(row: {
  id: string;
  weightG: number;
  recordedAt: Date;
  note: string | null;
}): WeightEntryDto {
  return {
    id: row.id,
    weightG: row.weightG,
    recordedAt: row.recordedAt.toISOString(),
    note: row.note,
  };
}

/**
 * Persist a weight check-in and sync profile.currentWeightG (Story 6.1).
 * Profile sync keeps BMR / exercise estimates aligned with the latest weigh-in.
 */
export async function createWeightEntry(
  input: CreateWeightEntryInput,
): Promise<WeightEntryDto> {
  const row = await prisma.$transaction(async (tx) => {
    const entry = await tx.weightEntry.create({
      data: {
        userId: input.userId,
        weightG: input.weightG,
        recordedAt: input.recordedAt,
        note: input.note?.trim() || null,
      },
    });
    assertOwnership(entry.userId, input.userId);

    const profile = await tx.userProfile.findUnique({
      where: { userId: input.userId },
      select: { userId: true },
    });
    if (profile) {
      assertOwnership(profile.userId, input.userId);
      await tx.userProfile.update({
        where: { userId: input.userId },
        data: {
          currentWeightG: input.weightG,
        } satisfies Prisma.UserProfileUpdateInput,
      });
    }

    return entry;
  });

  return toDto(row);
}

/** Recent active weigh-ins, newest first. */
export async function listRecentWeightEntriesForUser(
  userId: string,
  limit = 14,
): Promise<WeightEntryDto[]> {
  const rows = await prisma.weightEntry.findMany({
    where: { userId, deletedAt: null },
    orderBy: { recordedAt: "desc" },
    take: limit,
  });
  return rows.map(toDto);
}
