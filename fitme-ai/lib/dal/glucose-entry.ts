import "server-only";
import type { GlucoseContext, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwnedResource } from "@/lib/dal/guards";

export type CreateGlucoseEntryInput = {
  userId: string;
  valueMgDl: number;
  measuredAt: Date;
  context: GlucoseContext;
  note?: string | null;
  /** Offline reconcile idempotency (AD-12) — a repeat is not a second reading. */
  clientKey?: string | null;
};

export type UpdateGlucoseEntryInput = {
  valueMgDl: number;
  measuredAt: Date;
  context: GlucoseContext;
  note?: string | null;
};

export type GlucoseEntryDto = {
  id: string;
  valueMgDl: number;
  measuredAt: string;
  context: GlucoseContext;
  note: string | null;
};

function toDto(row: {
  id: string;
  valueMgDl: number;
  measuredAt: Date;
  context: GlucoseContext;
  note: string | null;
}): GlucoseEntryDto {
  return {
    id: row.id,
    valueMgDl: row.valueMgDl,
    measuredAt: row.measuredAt.toISOString(),
    context: row.context,
    note: row.note,
  };
}

export async function createGlucoseEntry(
  input: CreateGlucoseEntryInput,
): Promise<GlucoseEntryDto> {
  if (input.clientKey) {
    const existing = await prisma.glucoseEntry.findUnique({
      where: {
        userId_clientKey: {
          userId: input.userId,
          clientKey: input.clientKey,
        },
      },
    });
    if (existing && existing.deletedAt == null) return toDto(existing);
  }

  const row = await prisma.glucoseEntry.create({
    data: {
      userId: input.userId,
      valueMgDl: input.valueMgDl,
      measuredAt: input.measuredAt,
      context: input.context,
      note: input.note?.trim() || null,
      clientKey: input.clientKey ?? null,
    },
  });
  return toDto(row);
}

async function findOwnedGlucoseEntry(userId: string, id: string) {
  const row = await prisma.glucoseEntry.findFirst({
    where: { id, deletedAt: null },
  });
  return requireOwnedResource(row, userId);
}

export async function getGlucoseEntry(
  userId: string,
  id: string,
): Promise<GlucoseEntryDto> {
  const row = await findOwnedGlucoseEntry(userId, id);
  return toDto(row);
}

export async function updateGlucoseEntry(
  userId: string,
  id: string,
  patch: UpdateGlucoseEntryInput,
): Promise<GlucoseEntryDto> {
  await findOwnedGlucoseEntry(userId, id);
  const row = await prisma.glucoseEntry.update({
    where: { id },
    data: {
      valueMgDl: patch.valueMgDl,
      measuredAt: patch.measuredAt,
      context: patch.context,
      note: patch.note?.trim() || null,
    } satisfies Prisma.GlucoseEntryUpdateInput,
  });
  return toDto(row);
}

export async function softDeleteGlucoseEntry(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await findOwnedGlucoseEntry(userId, id);
  await prisma.glucoseEntry.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() } satisfies Prisma.GlucoseEntryUpdateInput,
  });
}

/** Restore a soft-deleted reading (undo path). */
export async function restoreGlucoseEntry(
  userId: string,
  id: string,
): Promise<void> {
  const row = await prisma.glucoseEntry.findFirst({
    where: { id, deletedAt: { not: null } },
    select: { id: true, userId: true },
  });
  const owned = requireOwnedResource(row, userId);
  await prisma.glucoseEntry.update({
    where: { id: owned.id },
    data: { deletedAt: null } satisfies Prisma.GlucoseEntryUpdateInput,
  });
}

export async function listRecentGlucoseEntriesForUser(
  userId: string,
  limit = 20,
): Promise<GlucoseEntryDto[]> {
  const rows = await prisma.glucoseEntry.findMany({
    where: { userId, deletedAt: null },
    orderBy: { measuredAt: "desc" },
    take: limit,
  });
  return rows.map(toDto);
}

/** Latest reading for Home glance (Story 8.4). */
export async function getLatestGlucoseEntry(
  userId: string,
): Promise<GlucoseEntryDto | null> {
  const row = await prisma.glucoseEntry.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { measuredAt: "desc" },
  });
  return row ? toDto(row) : null;
}
