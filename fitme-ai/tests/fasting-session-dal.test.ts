import { describe, it, expect, vi, beforeEach } from "vitest";

const findFirst = vi.fn();
const createRow = vi.fn();
const updateRow = vi.fn();
const findMany = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transaction(...args),
    fastingSession: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      update: (...args: unknown[]) => updateRow(...args),
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

import {
  ActiveFastExistsError,
  FastingOverlapError,
  FastingRangeError,
  discardActiveFastingSession,
  endFastingSession,
  getActiveFastingSession,
  logPastFastingSession,
  restoreFastingSession,
  softDeleteFastingSession,
  startFastingSession,
  updateFastingSession,
} from "@/lib/dal/fasting-session";
import { NotFoundError } from "@/lib/dal/guards";

const startedAt = new Date("2026-07-27T06:00:00.000Z");
const endedAt = new Date("2026-07-27T22:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      fastingSession: {
        findFirst: (...args: unknown[]) => findFirst(...args),
        create: (...args: unknown[]) => createRow(...args),
        update: (...args: unknown[]) => updateRow(...args),
      },
    }),
  );
});

describe("startFastingSession (Story 7.1)", () => {
  it("creates a session when none is active", async () => {
    findFirst.mockResolvedValueOnce(null);
    createRow.mockResolvedValue({
      id: "f1",
      userId: "u1",
      startedAt,
      endedAt: null,
      plannedDurationMin: 960,
      protocolLabel: "16:8",
      notes: null,
    });

    const dto = await startFastingSession({
      userId: "u1",
      plannedDurationMin: 960,
      protocolLabel: "16:8",
      startedAt,
    });

    expect(dto.isActive).toBe(true);
    expect(dto.protocolLabel).toBe("16:8");
    expect(dto.endedAt).toBeNull();
  });

  it("rejects a second active fast", async () => {
    findFirst.mockResolvedValueOnce({ id: "existing" });

    await expect(
      startFastingSession({ userId: "u1", startedAt }),
    ).rejects.toThrow(ActiveFastExistsError);
    expect(createRow).not.toHaveBeenCalled();
  });

  it("rejects a backdated start that lands inside a recorded fast", async () => {
    findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "old" });

    await expect(
      startFastingSession({ userId: "u1", startedAt }),
    ).rejects.toThrow(FastingOverlapError);
    expect(createRow).not.toHaveBeenCalled();
  });
});

describe("logPastFastingSession", () => {
  it("records a finished window that doesn't clash", async () => {
    findFirst.mockResolvedValue(null);
    createRow.mockResolvedValue({
      id: "f9",
      userId: "u1",
      startedAt,
      endedAt,
      plannedDurationMin: null,
      protocolLabel: null,
      notes: null,
    });

    const dto = await logPastFastingSession({
      userId: "u1",
      startedAt,
      endedAt,
    });

    expect(dto.isActive).toBe(false);
    expect(dto.durationMs).toBe(16 * 60 * 60 * 1000);
  });

  it("rejects an end before the start", async () => {
    await expect(
      logPastFastingSession({ userId: "u1", startedAt: endedAt, endedAt: startedAt }),
    ).rejects.toThrow(FastingRangeError);
    expect(createRow).not.toHaveBeenCalled();
  });

  it("rejects a window that overlaps an existing fast", async () => {
    findFirst.mockResolvedValue({ id: "clash" });

    await expect(
      logPastFastingSession({ userId: "u1", startedAt, endedAt }),
    ).rejects.toThrow(FastingOverlapError);
    expect(createRow).not.toHaveBeenCalled();
  });
});

describe("updateFastingSession", () => {
  it("corrects the window of an owned session", async () => {
    findFirst
      .mockResolvedValueOnce({
        id: "f1",
        userId: "u1",
        startedAt,
        endedAt,
        plannedDurationMin: null,
        protocolLabel: null,
        notes: null,
        deletedAt: null,
      })
      .mockResolvedValueOnce(null);
    const newEnd = new Date("2026-07-27T20:00:00.000Z");
    updateRow.mockResolvedValue({
      id: "f1",
      userId: "u1",
      startedAt,
      endedAt: newEnd,
      plannedDurationMin: null,
      protocolLabel: null,
      notes: "ok",
    });

    const dto = await updateFastingSession("u1", "f1", {
      startedAt,
      endedAt: newEnd,
      notes: "ok",
    });

    expect(dto.durationMs).toBe(14 * 60 * 60 * 1000);
    expect(dto.notes).toBe("ok");
  });

  it("rejects an edit that overlaps a different fast", async () => {
    findFirst
      .mockResolvedValueOnce({
        id: "f1",
        userId: "u1",
        startedAt,
        endedAt,
        plannedDurationMin: null,
        protocolLabel: null,
        notes: null,
        deletedAt: null,
      })
      .mockResolvedValueOnce({ id: "other" });

    await expect(
      updateFastingSession("u1", "f1", { startedAt, endedAt }),
    ).rejects.toThrow(FastingOverlapError);
    expect(updateRow).not.toHaveBeenCalled();
  });
});

describe("discardActiveFastingSession", () => {
  it("soft-deletes the in-progress fast", async () => {
    findFirst.mockResolvedValue({ id: "f1", userId: "u1" });
    updateRow.mockResolvedValue({});

    await discardActiveFastingSession("u1");

    expect(updateRow).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("throws NotFoundError when nothing is running", async () => {
    findFirst.mockResolvedValue(null);

    await expect(discardActiveFastingSession("u1")).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe("restoreFastingSession", () => {
  it("clears deletedAt when the window is still free", async () => {
    findFirst
      .mockResolvedValueOnce({ id: "f1", userId: "u1", startedAt, endedAt })
      .mockResolvedValueOnce(null);
    updateRow.mockResolvedValue({});

    await restoreFastingSession("u1", "f1");

    expect(updateRow).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: { deletedAt: null },
    });
  });

  it("refuses to restore into an overlapping window", async () => {
    findFirst
      .mockResolvedValueOnce({ id: "f1", userId: "u1", startedAt, endedAt })
      .mockResolvedValueOnce({ id: "clash" });

    await expect(restoreFastingSession("u1", "f1")).rejects.toThrow(
      FastingOverlapError,
    );
    expect(updateRow).not.toHaveBeenCalled();
  });
});

describe("endFastingSession (Story 7.1)", () => {
  it("sets endedAt on the active session", async () => {
    findFirst.mockResolvedValue({
      id: "f1",
      userId: "u1",
      startedAt,
      endedAt: null,
      plannedDurationMin: 960,
      protocolLabel: "16:8",
      notes: null,
    });
    const endedAt = new Date("2026-07-27T14:00:00.000Z");
    updateRow.mockResolvedValue({
      id: "f1",
      userId: "u1",
      startedAt,
      endedAt,
      plannedDurationMin: 960,
      protocolLabel: "16:8",
      notes: null,
    });

    const dto = await endFastingSession("u1", "f1", endedAt);

    expect(dto.isActive).toBe(false);
    expect(dto.durationMs).toBe(8 * 60 * 60 * 1000);
    expect(updateRow).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: { endedAt },
    });
  });

  it("throws NotFoundError when none active", async () => {
    findFirst.mockResolvedValue(null);

    await expect(endFastingSession("u1")).rejects.toThrow(NotFoundError);
  });
});

describe("getActiveFastingSession (Story 7.1)", () => {
  it("returns null when idle", async () => {
    findFirst.mockResolvedValue(null);
    await expect(getActiveFastingSession("u1")).resolves.toBeNull();
  });
});

describe("softDeleteFastingSession (Story 7.3)", () => {
  it("soft-deletes a completed session", async () => {
    findFirst.mockResolvedValue({
      id: "f1",
      userId: "u1",
      startedAt,
      endedAt: new Date("2026-07-27T14:00:00.000Z"),
      plannedDurationMin: 960,
      protocolLabel: "16:8",
      notes: null,
      deletedAt: null,
    });
    updateRow.mockResolvedValue({});

    await softDeleteFastingSession("u1", "f1");

    expect(updateRow).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("rejects deleting an active fast", async () => {
    findFirst.mockResolvedValue({
      id: "f1",
      userId: "u1",
      startedAt,
      endedAt: null,
      plannedDurationMin: 960,
      protocolLabel: "16:8",
      notes: null,
      deletedAt: null,
    });

    await expect(softDeleteFastingSession("u1", "f1")).rejects.toThrow(
      /active fast/i,
    );
    expect(updateRow).not.toHaveBeenCalled();
  });
});
