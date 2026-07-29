import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertOwnership, requireOwnedResource } from "@/lib/dal/guards";

export type CreateWaterEntryInput = {
  userId: string;
  amountMl: number;
  loggedAt: Date;
  /** Offline reconcile idempotency (AD-12) — a repeat is not a second glass. */
  clientKey?: string | null;
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
  if (input.clientKey) {
    const existing = await prisma.waterEntry.findUnique({
      where: {
        userId_clientKey: {
          userId: input.userId,
          clientKey: input.clientKey,
        },
      },
    });
    if (existing && existing.deletedAt == null) {
      assertOwnership(existing.userId, input.userId);
      return toDto(existing);
    }
  }

  const row = await prisma.waterEntry.create({
    data: {
      userId: input.userId,
      amountMl: input.amountMl,
      loggedAt: input.loggedAt,
      clientKey: input.clientKey ?? null,
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

/** Active water entries inside a day window, newest first (Home water list). */
export async function listWaterEntriesForUserBetween(
  userId: string,
  from: Date,
  to: Date,
): Promise<WaterEntryDto[]> {
  const rows = await prisma.waterEntry.findMany({
    where: { userId, deletedAt: null, loggedAt: { gte: from, lt: to } },
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

/**
 * Soft-delete an owned, active water entry. Missing and cross-user rows raise
 * (NotFound / Unauthorized) so callers can collapse both to one message.
 */
export async function softDeleteWaterEntry(
  userId: string,
  id: string,
): Promise<void> {
  const row = await prisma.waterEntry.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, userId: true },
  });
  const owned = requireOwnedResource(row, userId);
  await prisma.waterEntry.update({
    where: { id: owned.id },
    data: { deletedAt: new Date() } satisfies Prisma.WaterEntryUpdateInput,
  });
}

/** Restore a soft-deleted water entry (undo path). */
export async function restoreWaterEntry(
  userId: string,
  id: string,
): Promise<void> {
  const row = await prisma.waterEntry.findFirst({
    where: { id, deletedAt: { not: null } },
    select: { id: true, userId: true },
  });
  const owned = requireOwnedResource(row, userId);
  await prisma.waterEntry.update({
    where: { id: owned.id },
    data: { deletedAt: null } satisfies Prisma.WaterEntryUpdateInput,
  });
}
