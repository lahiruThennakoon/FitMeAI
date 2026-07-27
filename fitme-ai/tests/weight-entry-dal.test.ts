import { describe, it, expect, vi, beforeEach } from "vitest";

const createEntry = vi.fn();
const findProfile = vi.fn();
const updateProfile = vi.fn();
const findMany = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transaction(...args),
    weightEntry: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

import {
  createWeightEntry,
  listRecentWeightEntriesForUser,
} from "@/lib/dal/weight-entry";

const recordedAt = new Date("2026-07-27T08:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      weightEntry: {
        create: (...args: unknown[]) => createEntry(...args),
      },
      userProfile: {
        findUnique: (...args: unknown[]) => findProfile(...args),
        update: (...args: unknown[]) => updateProfile(...args),
      },
    }),
  );
});

describe("createWeightEntry (Story 6.1)", () => {
  it("creates a check-in and syncs profile currentWeightG", async () => {
    createEntry.mockResolvedValue({
      id: "w1",
      userId: "u1",
      weightG: 70_000,
      recordedAt,
      note: null,
    });
    findProfile.mockResolvedValue({ userId: "u1" });
    updateProfile.mockResolvedValue({});

    const dto = await createWeightEntry({
      userId: "u1",
      weightG: 70_000,
      recordedAt,
    });

    expect(dto).toEqual({
      id: "w1",
      weightG: 70_000,
      recordedAt: recordedAt.toISOString(),
      note: null,
    });
    expect(updateProfile).toHaveBeenCalledWith({
      where: { userId: "u1" },
      data: { currentWeightG: 70_000 },
    });
  });

  it("still saves when the user has no profile yet", async () => {
    createEntry.mockResolvedValue({
      id: "w2",
      userId: "u1",
      weightG: 68_000,
      recordedAt,
      note: null,
    });
    findProfile.mockResolvedValue(null);

    const dto = await createWeightEntry({
      userId: "u1",
      weightG: 68_000,
      recordedAt,
    });

    expect(dto.id).toBe("w2");
    expect(updateProfile).not.toHaveBeenCalled();
  });
});

describe("listRecentWeightEntriesForUser (Story 6.1)", () => {
  it("returns newest first", async () => {
    findMany.mockResolvedValue([
      {
        id: "w1",
        weightG: 70_000,
        recordedAt,
        note: null,
      },
    ]);

    const list = await listRecentWeightEntriesForUser("u1", 14);

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "u1", deletedAt: null },
      orderBy: { recordedAt: "desc" },
      take: 14,
    });
    expect(list[0]?.weightG).toBe(70_000);
  });
});
