import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertOwnership } from "@/lib/dal/guards";

export type CreateWaterEntryInput = {
  userId: string;
  amountMl: number;
  loggedAt: Date;
};

export type WaterEntryDto = {
  id: string;
  amountMl: number;
  loggedAt: string;
};

function toDto(row: { id: string; amountMl: number; loggedAt: Date }): WaterEntryDto {
  return {
    id: row.id,
    amountMl: row.amountMl,
    loggedAt: row.loggedAt.toISOString(),
  };
}

export async function createWaterEntry(
  input: CreateWaterEntryInput,
): Promise<WaterEntryDto> {
  const row = await prisma.waterEntry.create({
    data: {
      userId: input.userId,
      amountMl: input.amountMl,
      loggedAt: input.loggedAt,
    },
  });
  assertOwnership(row.userId, input.userId);
  return toDto(row);
}

/** Active (non-deleted) water entries for a user, newest first. */
export async function listActiveWaterEntriesForUser(userId: string) {
  const rows = await prisma.waterEntry.findMany({
    where: { userId, deletedAt: null },
    orderBy: { loggedAt: "desc" },
  });
  return rows.map(toDto);
}

export async function sumWaterMlForUserBetween(
  userId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const agg = await prisma.waterEntry.aggregate({
    where: {
      userId,
      deletedAt: null,
      loggedAt: { gte: from, lt: to },
    },
    _sum: { amountMl: true },
  });
  return agg._sum.amountMl ?? 0;
}

/** Test helper — soft-delete. */
export async function softDeleteWaterEntry(
  userId: string,
  id: string,
): Promise<void> {
  const row = await prisma.waterEntry.findFirst({
    where: { id, userId, deletedAt: null },
  });
  if (!row) return;
  assertOwnership(row.userId, userId);
  await prisma.waterEntry.update({
    where: { id },
    data: { deletedAt: new Date() } satisfies Prisma.WaterEntryUpdateInput,
  });
}
