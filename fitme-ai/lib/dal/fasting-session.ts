import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  assertOwnership,
  NotFoundError,
  requireOwnedResource,
} from "@/lib/dal/guards";

export class ActiveFastExistsError extends Error {
  constructor(message = "An active fast is already in progress") {
    super(message);
    this.name = "ActiveFastExistsError";
  }
}

export type StartFastingSessionInput = {
  userId: string;
  startedAt?: Date;
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

    const row = await tx.fastingSession.create({
      data: {
        userId: input.userId,
        startedAt: input.startedAt ?? new Date(),
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

  if (endedAt.getTime() < owned.startedAt.getTime()) {
    throw new Error("End time cannot be before start time");
  }

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
