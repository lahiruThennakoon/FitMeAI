import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertOwnership, requireOwnedResource } from "@/lib/dal/guards";

export type CreateWeightEntryInput = {
  userId: string;
  weightG: number;
  recordedAt: Date;
  note?: string | null;
  /** Offline reconcile idempotency (AD-12) — a repeat is not a second weigh-in. */
  clientKey?: string | null;
};

export type UpdateWeightEntryInput = {
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

/** Minimal transaction surface used by the profile-sync helper. */
type WeightTx = {
  weightEntry: { findFirst: typeof prisma.weightEntry.findFirst };
  userProfile: {
    findUnique: typeof prisma.userProfile.findUnique;
    update: typeof prisma.userProfile.update;
  };
};

/**
 * Point profile.currentWeightG at the newest surviving weigh-in.
 *
 * Derived rather than "last write wins" so backdating an older weigh-in, or
 * removing the newest one, can't leave BMR estimates on a stale number. With
 * no entries left the profile value is kept — it's a required field and the
 * onboarding value is still the best guess.
 */
async function syncProfileWeightFromLatest(
  tx: WeightTx,
  userId: string,
): Promise<void> {
  const latest = await tx.weightEntry.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { recordedAt: "desc" },
    select: { weightG: true },
  });
  if (!latest) return;

  const profile = await tx.userProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });
  if (!profile) return;

  assertOwnership(profile.userId, userId);
  await tx.userProfile.update({
    where: { userId },
    data: {
      currentWeightG: latest.weightG,
    } satisfies Prisma.UserProfileUpdateInput,
  });
}

/**
 * Persist a weight check-in and sync profile.currentWeightG (Story 6.1).
 * Profile sync keeps BMR / exercise estimates aligned with the latest weigh-in.
 */
export async function createWeightEntry(
  input: CreateWeightEntryInput,
): Promise<WeightEntryDto> {
  if (input.clientKey) {
    const existing = await prisma.weightEntry.findUnique({
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

  const row = await prisma.$transaction(async (tx) => {
    const entry = await tx.weightEntry.create({
      data: {
        userId: input.userId,
        weightG: input.weightG,
        recordedAt: input.recordedAt,
        note: input.note?.trim() || null,
        clientKey: input.clientKey ?? null,
      },
    });
    assertOwnership(entry.userId, input.userId);
    await syncProfileWeightFromLatest(tx as WeightTx, input.userId);
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

async function findOwnedWeightEntry(
  userId: string,
  id: string,
  { deleted = false }: { deleted?: boolean } = {},
): Promise<{ id: string; userId: string }> {
  const row = await prisma.weightEntry.findFirst({
    where: { id, deletedAt: deleted ? { not: null } : null },
    select: { id: true, userId: true },
  });
  return requireOwnedResource(row, userId);
}

/** Correct a saved weigh-in — value, date or note (FR-9 correction path). */
export async function updateWeightEntry(
  userId: string,
  id: string,
  patch: UpdateWeightEntryInput,
): Promise<WeightEntryDto> {
  const existing = await findOwnedWeightEntry(userId, id);

  const row = await prisma.$transaction(async (tx) => {
    const entry = await tx.weightEntry.update({
      where: { id: existing.id },
      data: {
        weightG: patch.weightG,
        recordedAt: patch.recordedAt,
        note: patch.note?.trim() || null,
      } satisfies Prisma.WeightEntryUpdateInput,
    });
    await syncProfileWeightFromLatest(tx as WeightTx, userId);
    return entry;
  });

  return toDto(row);
}

/** Soft-delete an owned weigh-in and re-derive profile weight. */
export async function softDeleteWeightEntry(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await findOwnedWeightEntry(userId, id);
  await prisma.$transaction(async (tx) => {
    await tx.weightEntry.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() } satisfies Prisma.WeightEntryUpdateInput,
    });
    await syncProfileWeightFromLatest(tx as WeightTx, userId);
  });
}

/** Restore a soft-deleted weigh-in (undo path). */
export async function restoreWeightEntry(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await findOwnedWeightEntry(userId, id, { deleted: true });
  await prisma.$transaction(async (tx) => {
    await tx.weightEntry.update({
      where: { id: existing.id },
      data: { deletedAt: null } satisfies Prisma.WeightEntryUpdateInput,
    });
    await syncProfileWeightFromLatest(tx as WeightTx, userId);
  });
}
