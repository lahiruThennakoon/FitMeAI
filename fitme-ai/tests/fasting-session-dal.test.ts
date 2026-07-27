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
  endFastingSession,
  getActiveFastingSession,
  startFastingSession,
} from "@/lib/dal/fasting-session";
import { NotFoundError } from "@/lib/dal/guards";

const startedAt = new Date("2026-07-27T06:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      fastingSession: {
        findFirst: (...args: unknown[]) => findFirst(...args),
        create: (...args: unknown[]) => createRow(...args),
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
