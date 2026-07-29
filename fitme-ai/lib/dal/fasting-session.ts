import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertOwnership, requireOwnedResource } from "@/lib/dal/guards";

export class ActiveFastExistsError extends Error {
  constructor(message = "An active fast is already in progress") {
    super(message);
    this.name = "ActiveFastExistsError";
  }
}

export class FastingOverlapError extends Error {
  constructor(message = "That window overlaps another fast") {
    super(message);
    this.name = "FastingOverlapError";
  }
}

export class FastingRangeError extends Error {
  constructor(message = "End time cannot be before start time") {
    super(message);
    this.name = "FastingRangeError";
  }
}

export type StartFastingSessionInput = {
  userId: string;
  startedAt?: Date;
  plannedDurationMin?: number | null;
  protocolLabel?: string | null;
  notes?: string | null;
};

export type LogPastFastingSessionInput = {
  userId: string;
  startedAt: Date;
  endedAt: Date;
  plannedDurationMin?: number | null;
  protocolLabel?: string | null;
  notes?: string | null;
};

export type UpdateFastingSessionInput = {
  startedAt: Date;
  /** Null keeps (or makes) the session active; a Date completes it. */
  endedAt: Date | null;
  plannedDurationMin?: number | null;
  protocolLabel?: string | null;
  notes?: string | null;
};

export type FastingSessionDto = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  plannedDurationMin: number | null;
  protocolLabel: string | null;
  notes: string | null;
  /** Elapsed ms at DTO build time (active) or full duration when ended. */
  durationMs: number;
  isActive: boolean;
};

function toDto(
  row: {
    id: string;
    startedAt: Date;
    endedAt: Date | null;
    plannedDurationMin: number | null;
    protocolLabel: string | null;
    notes: string | null;
  },
  now: Date = new Date(),
): FastingSessionDto {
  const end = row.endedAt ?? now;
  return {
    id: row.id,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    plannedDurationMin: row.plannedDurationMin,
    protocolLabel: row.protocolLabel,
    notes: row.notes,
    durationMs: Math.max(0, end.getTime() - row.startedAt.getTime()),
    isActive: row.endedAt == null,
  };
}

type OverlapTx = {
  fastingSession: { findFirst: typeof prisma.fastingSession.findFirst };
};

/**
 * Reject a window that collides with another session.
 *
 * Two fasts can't run at once, so a backdated or edited window that overlaps
 * an existing one is a data error rather than something to silently accept.
 * An open-ended session is treated as running to infinity.
 */
async function assertNoOverlap(
  tx: OverlapTx,
  userId: string,
  window: { startedAt: Date; endedAt: Date | null; excludeId?: string },
): Promise<void> {
  const clash = await tx.fastingSession.findFirst({
    where: {
      userId,
      deletedAt: null,
      ...(window.excludeId ? { id: { not: window.excludeId } } : {}),
      // existing.startedAt < window.end (open window → no upper bound)
      ...(window.endedAt ? { startedAt: { lt: window.endedAt } } : {}),
      // existing.end > window.startedAt, where a null end means "still open"
      OR: [{ endedAt: null }, { endedAt: { gt: window.startedAt } }],
    },
    select: { id: true },
  });
  if (clash) throw new FastingOverlapError();
}

function assertValidRange(startedAt: Date, endedAt: Date | null): void {
  if (endedAt && endedAt.getTime() < startedAt.getTime()) {
    throw new FastingRangeError();
  }
}

/** Current in-progress fast for the user, if any. */
export async function getActiveFastingSession(
  userId: string,
): Promise<FastingSessionDto | null> {
  const row = await prisma.fastingSession.findFirst({
    where: { userId, endedAt: null, deletedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (!row) return null;
  assertOwnership(row.userId, userId);
  return toDto(row);
}

/**
 * Start a fast. Rejects if an active session already exists.
 */
export async function startFastingSession(
  input: StartFastingSessionInput,
): Promise<FastingSessionDto> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.fastingSession.findFirst({
      where: {
        userId: input.userId,
        endedAt: null,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) throw new ActiveFastExistsError();

    const startedAt = input.startedAt ?? new Date();
    // A backdated start can still land inside a completed fast.
    await assertNoOverlap(tx as OverlapTx, input.userId, {
      startedAt,
      endedAt: null,
    });

    const row = await tx.fastingSession.create({
      data: {
        userId: input.userId,
        startedAt,
        plannedDurationMin: input.plannedDurationMin ?? null,
        protocolLabel: input.protocolLabel?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });
    assertOwnership(row.userId, input.userId);
    return toDto(row);
  });
}

/** End the user's active fast (or a specific owned active session). */
export async function endFastingSession(
  userId: string,
  sessionId?: string,
  endedAt: Date = new Date(),
): Promise<FastingSessionDto> {
  const row = await prisma.fastingSession.findFirst({
    where: sessionId
      ? { id: sessionId, deletedAt: null, endedAt: null }
      : { userId, deletedAt: null, endedAt: null },
  });
  const owned = requireOwnedResource(row, userId);

  assertValidRange(owned.startedAt, endedAt);

  const updated = await prisma.fastingSession.update({
    where: { id: owned.id },
    data: { endedAt } satisfies Prisma.FastingSessionUpdateInput,
  });
  return toDto(updated, endedAt);
}

/** Recent sessions (active first by startedAt desc among all non-deleted). */
export async function listRecentFastingSessions(
  userId: string,
  limit = 10,
): Promise<FastingSessionDto[]> {
  const rows = await prisma.fastingSession.findMany({
    where: { userId, deletedAt: null },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
  return rows.map((r) => toDto(r));
}

async function findOwnedFastingSession(userId: string, id: string) {
  const row = await prisma.fastingSession.findFirst({
    where: { id, deletedAt: null },
  });
  return requireOwnedResource(row, userId);
}

/** Soft-delete a completed fasting session from history (Story 7.3). */
export async function softDeleteFastingSession(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await findOwnedFastingSession(userId, id);
  if (existing.endedAt == null) {
    throw new Error("Cannot delete an active fast — end it first");
  }
  await prisma.fastingSession.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() } satisfies Prisma.FastingSessionUpdateInput,
  });
}

/**
 * Abandon the in-progress fast without recording it (Story 7.1 follow-up).
 *
 * Distinct from ending: a fast started by mistake, or one the user doesn't
 * want in their history, shouldn't force a fake completed row.
 */
export async function discardActiveFastingSession(
  userId: string,
  sessionId?: string,
): Promise<void> {
  const row = await prisma.fastingSession.findFirst({
    where: sessionId
      ? { id: sessionId, deletedAt: null, endedAt: null }
      : { userId, deletedAt: null, endedAt: null },
    select: { id: true, userId: true },
  });
  const owned = requireOwnedResource(row, userId);
  await prisma.fastingSession.update({
    where: { id: owned.id },
    data: { deletedAt: new Date() } satisfies Prisma.FastingSessionUpdateInput,
  });
}

/** Restore a soft-deleted session (undo path). */
export async function restoreFastingSession(
  userId: string,
  id: string,
): Promise<void> {
  const row = await prisma.fastingSession.findFirst({
    where: { id, deletedAt: { not: null } },
    select: { id: true, userId: true, startedAt: true, endedAt: true },
  });
  const owned = requireOwnedResource(row, userId);
  await prisma.$transaction(async (tx) => {
    await assertNoOverlap(tx as OverlapTx, userId, {
      startedAt: owned.startedAt,
      endedAt: owned.endedAt,
      excludeId: owned.id,
    });
    await tx.fastingSession.update({
      where: { id: owned.id },
      data: { deletedAt: null } satisfies Prisma.FastingSessionUpdateInput,
    });
  });
}

/**
 * Record a fast that already finished (Story 7.1 follow-up) — the "I forgot to
 * press start" path. Never becomes the active session because it has an end.
 */
export async function logPastFastingSession(
  input: LogPastFastingSessionInput,
): Promise<FastingSessionDto> {
  assertValidRange(input.startedAt, input.endedAt);

  return prisma.$transaction(async (tx) => {
    await assertNoOverlap(tx as OverlapTx, input.userId, {
      startedAt: input.startedAt,
      endedAt: input.endedAt,
    });
    const row = await tx.fastingSession.create({
      data: {
        userId: input.userId,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        plannedDurationMin: input.plannedDurationMin ?? null,
        protocolLabel: input.protocolLabel?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });
    assertOwnership(row.userId, input.userId);
    return toDto(row);
  });
}

/**
 * Correct any owned session — start, end, protocol, planned length, notes.
 * Passing `endedAt: null` on a completed fast reopens it as the active one.
 */
export async function updateFastingSession(
  userId: string,
  id: string,
  patch: UpdateFastingSessionInput,
): Promise<FastingSessionDto> {
  const existing = await findOwnedFastingSession(userId, id);
  assertValidRange(patch.startedAt, patch.endedAt);

  return prisma.$transaction(async (tx) => {
    await assertNoOverlap(tx as OverlapTx, userId, {
      startedAt: patch.startedAt,
      endedAt: patch.endedAt,
      excludeId: existing.id,
    });
    const row = await tx.fastingSession.update({
      where: { id: existing.id },
      data: {
        startedAt: patch.startedAt,
        endedAt: patch.endedAt,
        plannedDurationMin: patch.plannedDurationMin ?? null,
        protocolLabel: patch.protocolLabel?.trim() || null,
        notes: patch.notes?.trim() || null,
      } satisfies Prisma.FastingSessionUpdateInput,
    });
    return toDto(row);
  });
}

/** Fetch a single owned session for populating an edit form. */
export async function getFastingSession(
  userId: string,
  id: string,
): Promise<FastingSessionDto> {
  const row = await findOwnedFastingSession(userId, id);
  return toDto(row);
}
