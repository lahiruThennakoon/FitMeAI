import { describe, it, expect, vi, beforeEach } from "vitest";

const createRow = vi.fn();
const findManyRows = vi.fn();
const aggregateRows = vi.fn();
const findFirstRow = vi.fn();
const updateRow = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    waterEntry: {
      create: (...args: unknown[]) => createRow(...args),
      findMany: (...args: unknown[]) => findManyRows(...args),
      aggregate: (...args: unknown[]) => aggregateRows(...args),
      findFirst: (...args: unknown[]) => findFirstRow(...args),
      update: (...args: unknown[]) => updateRow(...args),
    },
  },
}));

import {
  createWaterEntry,
  listActiveWaterEntriesForUser,
  softDeleteWaterEntry,
  sumWaterMlForUserBetween,
} from "@/lib/dal/water-entry";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";

const loggedAt = new Date("2026-07-26T08:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createWaterEntry (Story 5.1 / FR-15)", () => {
  it("creates a water entry and returns a DTO", async () => {
    createRow.mockResolvedValue({
      id: "w1",
      userId: "u1",
      amountMl: 250,
      loggedAt,
    });

    const dto = await createWaterEntry({
      userId: "u1",
      amountMl: 250,
      loggedAt,
    });

    expect(createRow).toHaveBeenCalledWith({
      data: { userId: "u1", amountMl: 250, loggedAt, clientKey: null },
    });
    expect(dto).toEqual({
      id: "w1",
      amountMl: 250,
      loggedAt: loggedAt.toISOString(),
    });
  });

  it("rejects a row whose ownership does not match the caller (defense in depth)", async () => {
    createRow.mockResolvedValue({
      id: "w1",
      userId: "someone-else",
      amountMl: 250,
      loggedAt,
    });

    await expect(
      createWaterEntry({ userId: "u1", amountMl: 250, loggedAt }),
    ).rejects.toThrow(UnauthorizedError);
  });
});

describe("listActiveWaterEntriesForUser", () => {
  it("maps active rows newest first", async () => {
    findManyRows.mockResolvedValue([
      { id: "w2", amountMl: 500, loggedAt },
      { id: "w1", amountMl: 250, loggedAt },
    ]);

    const rows = await listActiveWaterEntriesForUser("u1");

    expect(findManyRows).toHaveBeenCalledWith({
      where: { userId: "u1", deletedAt: null },
      orderBy: { loggedAt: "desc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].amountMl).toBe(500);
  });
});

describe("sumWaterMlForUserBetween", () => {
  it("sums amountMl for the day window", async () => {
    aggregateRows.mockResolvedValue({ _sum: { amountMl: 750 } });

    const total = await sumWaterMlForUserBetween(
      "u1",
      new Date("2026-07-26T00:00:00.000Z"),
      new Date("2026-07-27T00:00:00.000Z"),
    );

    expect(total).toBe(750);
  });

  it("returns 0 when there are no entries", async () => {
    aggregateRows.mockResolvedValue({ _sum: { amountMl: null } });

    const total = await sumWaterMlForUserBetween(
      "u1",
      new Date(),
      new Date(),
    );

    expect(total).toBe(0);
  });
});

describe("softDeleteWaterEntry", () => {
  it("soft-deletes an owned entry", async () => {
    findFirstRow.mockResolvedValue({ id: "w1", userId: "u1" });

    await softDeleteWaterEntry("u1", "w1");

    expect(updateRow).toHaveBeenCalledWith({
      where: { id: "w1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("raises NotFound when the entry does not exist or is already deleted", async () => {
    findFirstRow.mockResolvedValue(null);

    await expect(softDeleteWaterEntry("u1", "missing")).rejects.toThrow(
      NotFoundError,
    );
    expect(updateRow).not.toHaveBeenCalled();
  });

  it("rejects deleting another user's entry", async () => {
    findFirstRow.mockResolvedValue({ id: "w1", userId: "someone-else" });

    await expect(softDeleteWaterEntry("u1", "w1")).rejects.toThrow(
      UnauthorizedError,
    );
    expect(updateRow).not.toHaveBeenCalled();
  });
});
