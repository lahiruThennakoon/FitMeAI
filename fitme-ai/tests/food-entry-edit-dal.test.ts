import { describe, it, expect, vi, beforeEach } from "vitest";

const findFirstRow = vi.fn();
const updateRow = vi.fn();
const createCorrection = vi.fn();
const transactionFn = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    foodEntry: {
      findFirst: (...args: unknown[]) => findFirstRow(...args),
      update: (...args: unknown[]) => updateRow(...args),
    },
    userCorrection: {
      create: (...args: unknown[]) => createCorrection(...args),
    },
    $transaction: (...args: unknown[]) => transactionFn(...args),
  },
}));

import {
  getEditableFoodEntry,
  softDeleteFoodEntry,
  updateFoodEntry,
} from "@/lib/dal/food-entry";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";

const loggedAt = new Date("2026-07-26T08:00:00.000Z");

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "f1",
    userId: "u1",
    name: "Egg",
    quantity: 1,
    unit: "piece",
    mealType: "breakfast",
    loggedAt,
    energyKcal: 72,
    proteinG: 6.3,
    carbsG: 0.4,
    fatG: 4.8,
    fibreG: 0,
    sugarG: 0.2,
    sodiumMg: 140,
    note: null,
    aiInteractionId: null,
    ...overrides,
  };
}

const editPatch = {
  name: "Two eggs",
  quantity: 2,
  unit: "piece",
  mealType: "breakfast" as const,
  loggedAt,
  energyKcal: 144,
  proteinG: 12.6,
  carbsG: 0.8,
  fatG: 9.6,
  fibreG: 0,
  sugarG: 0.4,
  sodiumMg: 140,
  note: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  // $transaction runs the passed callback against a `tx` shaped like prisma itself.
  transactionFn.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      foodEntry: { update: (...args: unknown[]) => updateRow(...args) },
      userCorrection: { create: (...args: unknown[]) => createCorrection(...args) },
    }),
  );
});

describe("getEditableFoodEntry (Story 5.2)", () => {
  it("returns the DTO for an owned entry", async () => {
    findFirstRow.mockResolvedValue(row());

    const dto = await getEditableFoodEntry("u1", "f1");

    expect(dto).toEqual({
      id: "f1",
      name: "Egg",
      quantity: 1,
      unit: "piece",
      mealType: "breakfast",
      loggedAt: loggedAt.toISOString(),
      energyKcal: 72,
      proteinG: 6.3,
      carbsG: 0.4,
      fatG: 4.8,
      fibreG: 0,
      sugarG: 0.2,
      sodiumMg: 140,
      note: null,
      isAiOrigin: false,
    });
  });

  it("throws NotFoundError when the entry is missing or deleted", async () => {
    findFirstRow.mockResolvedValue(null);

    await expect(getEditableFoodEntry("u1", "missing")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws UnauthorizedError for another user's entry", async () => {
    findFirstRow.mockResolvedValue(row({ userId: "someone-else" }));

    await expect(getEditableFoodEntry("u1", "f1")).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("flags isAiOrigin when an aiInteractionId is present", async () => {
    findFirstRow.mockResolvedValue(row({ aiInteractionId: "ai1" }));

    const dto = await getEditableFoodEntry("u1", "f1");

    expect(dto.isAiOrigin).toBe(true);
  });
});

describe("updateFoodEntry (Story 5.2 AC1)", () => {
  it("updates name/quantity/macros on an owned entry", async () => {
    findFirstRow.mockResolvedValue(row());
    updateRow.mockResolvedValue({ ...row(), ...editPatch });

    const dto = await updateFoodEntry("u1", "f1", editPatch);

    expect(updateRow).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: {
        name: "Two eggs",
        quantity: 2,
        unit: "piece",
        mealType: "breakfast",
        loggedAt,
        energyKcal: 144,
        proteinG: 12.6,
        carbsG: 0.8,
        fatG: 9.6,
        fibreG: 0,
        sugarG: 0.4,
        sodiumMg: 140,
        note: null,
      },
    });
    expect(dto.name).toBe("Two eggs");
    expect(dto.quantity).toBe(2);
  });

  it("records a note edit in the audit trail for an AI-origin entry", async () => {
    findFirstRow.mockResolvedValue(row({ aiInteractionId: "ai1" }));
    const patch = { ...editPatch, note: "half portion, shared" };
    updateRow.mockResolvedValue({ ...row({ aiInteractionId: "ai1" }), ...patch });

    await updateFoodEntry("u1", "f1", patch);

    const fields = createCorrection.mock.calls.map(
      (c) => (c[0] as { data: { field: string } }).data.field,
    );
    expect(fields).toContain("note");
  });

  it("logs UserCorrection rows for an AI-origin entry with changed fields", async () => {
    findFirstRow.mockResolvedValue(row({ aiInteractionId: "ai1" }));
    updateRow.mockResolvedValue({ ...row({ aiInteractionId: "ai1" }), ...editPatch });

    await updateFoodEntry("u1", "f1", editPatch);

    expect(createCorrection).toHaveBeenCalled();
    const fields = createCorrection.mock.calls.map(
      (c) => (c[0] as { data: { field: string } }).data.field,
    );
    expect(fields).toContain("name");
    expect(fields).toContain("quantity");
    expect(fields).toContain("energyKcal");
  });

  it("does not log UserCorrection rows for a manual (non-AI) entry", async () => {
    findFirstRow.mockResolvedValue(row({ aiInteractionId: null }));
    updateRow.mockResolvedValue({ ...row(), ...editPatch });

    await updateFoodEntry("u1", "f1", editPatch);

    expect(createCorrection).not.toHaveBeenCalled();
  });

  it("does not log UserCorrection rows when nothing actually changed", async () => {
    const unchanged = {
      name: "Egg",
      quantity: 1,
      unit: "piece",
      mealType: "breakfast" as const,
      loggedAt,
      energyKcal: 72,
      proteinG: 6.3,
      carbsG: 0.4,
      fatG: 4.8,
      fibreG: 0,
      sugarG: 0.2,
      sodiumMg: 140,
      note: null,
    };
    findFirstRow.mockResolvedValue(row({ aiInteractionId: "ai1" }));
    updateRow.mockResolvedValue({ ...row({ aiInteractionId: "ai1" }), ...unchanged });

    await updateFoodEntry("u1", "f1", unchanged);

    expect(createCorrection).not.toHaveBeenCalled();
  });

  it("rejects editing another user's entry", async () => {
    findFirstRow.mockResolvedValue(row({ userId: "someone-else" }));

    await expect(updateFoodEntry("u1", "f1", editPatch)).rejects.toThrow(
      UnauthorizedError,
    );
    expect(updateRow).not.toHaveBeenCalled();
  });

  it("rejects editing a missing/deleted entry", async () => {
    findFirstRow.mockResolvedValue(null);

    await expect(updateFoodEntry("u1", "missing", editPatch)).rejects.toThrow(
      NotFoundError,
    );
    expect(updateRow).not.toHaveBeenCalled();
  });
});

describe("softDeleteFoodEntry (Story 5.2 AC2)", () => {
  it("soft-deletes an owned entry", async () => {
    findFirstRow.mockResolvedValue(row());

    await softDeleteFoodEntry("u1", "f1");

    expect(updateRow).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("rejects deleting another user's entry", async () => {
    findFirstRow.mockResolvedValue(row({ userId: "someone-else" }));

    await expect(softDeleteFoodEntry("u1", "f1")).rejects.toThrow(
      UnauthorizedError,
    );
    expect(updateRow).not.toHaveBeenCalled();
  });

  it("rejects deleting a missing/already-deleted entry", async () => {
    findFirstRow.mockResolvedValue(null);

    await expect(softDeleteFoodEntry("u1", "missing")).rejects.toThrow(
      NotFoundError,
    );
    expect(updateRow).not.toHaveBeenCalled();
  });
});
