import { describe, it, expect, vi, beforeEach } from "vitest";

const createEntry = vi.fn();
const findProfile = vi.fn();
const updateProfile = vi.fn();
const findMany = vi.fn();
const findFirst = vi.fn();
const updateEntry = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transaction(...args),
    weightEntry: {
      findMany: (...args: unknown[]) => findMany(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
  },
}));

import {
  createWeightEntry,
  listRecentWeightEntriesForUser,
  restoreWeightEntry,
  softDeleteWeightEntry,
  updateWeightEntry,
} from "@/lib/dal/weight-entry";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";

const recordedAt = new Date("2026-07-27T08:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  findFirst.mockResolvedValue({ weightG: 70_000 });
  transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      weightEntry: {
        create: (...args: unknown[]) => createEntry(...args),
        update: (...args: unknown[]) => updateEntry(...args),
        findFirst: (...args: unknown[]) => findFirst(...args),
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

describe("updateWeightEntry", () => {
  it("saves the correction and re-derives profile weight from the newest entry", async () => {
    findFirst
      .mockResolvedValueOnce({ id: "w1", userId: "u1" })
      // Backdating means a different entry is now the newest one.
      .mockResolvedValueOnce({ weightG: 71_500 });
    updateEntry.mockResolvedValue({
      id: "w1",
      userId: "u1",
      weightG: 69_000,
      recordedAt,
      note: "morning",
    });
    findProfile.mockResolvedValue({ userId: "u1" });

    const dto = await updateWeightEntry("u1", "w1", {
      weightG: 69_000,
      recordedAt,
      note: "morning",
    });

    expect(dto.weightG).toBe(69_000);
    expect(updateProfile).toHaveBeenCalledWith({
      where: { userId: "u1" },
      data: { currentWeightG: 71_500 },
    });
  });

  it("rejects another user's entry", async () => {
    findFirst.mockResolvedValueOnce({ id: "w1", userId: "u2" });

    await expect(
      updateWeightEntry("u1", "w1", { weightG: 69_000, recordedAt }),
    ).rejects.toThrow(UnauthorizedError);
    expect(updateEntry).not.toHaveBeenCalled();
  });
});

describe("softDeleteWeightEntry", () => {
  it("soft-deletes and re-syncs the profile", async () => {
    findFirst
      .mockResolvedValueOnce({ id: "w1", userId: "u1" })
      .mockResolvedValueOnce({ weightG: 72_000 });
    updateEntry.mockResolvedValue({});
    findProfile.mockResolvedValue({ userId: "u1" });

    await softDeleteWeightEntry("u1", "w1");

    expect(updateEntry).toHaveBeenCalledWith({
      where: { id: "w1" },
      data: { deletedAt: expect.any(Date) },
    });
    expect(updateProfile).toHaveBeenCalledWith({
      where: { userId: "u1" },
      data: { currentWeightG: 72_000 },
    });
  });

  it("throws NotFoundError for a missing entry", async () => {
    findFirst.mockResolvedValueOnce(null);

    await expect(softDeleteWeightEntry("u1", "gone")).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe("restoreWeightEntry", () => {
  it("clears deletedAt and re-syncs the profile", async () => {
    findFirst
      .mockResolvedValueOnce({ id: "w1", userId: "u1" })
      .mockResolvedValueOnce({ weightG: 70_000 });
    updateEntry.mockResolvedValue({});
    findProfile.mockResolvedValue({ userId: "u1" });

    await restoreWeightEntry("u1", "w1");

    expect(updateEntry).toHaveBeenCalledWith({
      where: { id: "w1" },
      data: { deletedAt: null },
    });
  });

  it("only looks at soft-deleted rows", async () => {
    findFirst.mockResolvedValueOnce(null);

    await expect(restoreWeightEntry("u1", "w1")).rejects.toThrow(NotFoundError);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "w1", deletedAt: { not: null } },
      }),
    );
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
