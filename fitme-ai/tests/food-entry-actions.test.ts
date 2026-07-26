import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deleteFoodEntryAction,
  updateFoodEntryAction,
} from "@/app/actions/food-entry";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";

const updateEntry = vi.fn();
const deleteEntry = vi.fn();

const session = async () =>
  ({ id: "u1", email: "a@b.com", name: null }) as never;

const validEdit = {
  name: "Two eggs",
  quantity: 2,
  energyKcal: 144,
  proteinG: 12.6,
  carbsG: 0.8,
  fatG: 9.6,
  fibreG: 0,
  sugarG: 0.4,
};

beforeEach(() => {
  vi.clearAllMocks();
  updateEntry.mockResolvedValue({ id: "f1", ...validEdit, isAiOrigin: false });
});

describe("updateFoodEntryAction (Story 5.2 AC1)", () => {
  it("saves a valid edit", async () => {
    const result = await updateFoodEntryAction("f1", validEdit, {
      requireSession: session,
      updateFoodEntry: updateEntry,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.entry.name).toBe("Two eggs");
    }
    expect(updateEntry).toHaveBeenCalledWith("u1", "f1", validEdit);
  });

  it("requires sign-in", async () => {
    const result = await updateFoodEntryAction("f1", validEdit, {
      requireSession: async () => {
        throw new Error("no session");
      },
      updateFoodEntry: updateEntry,
    });

    expect(result.ok).toBe(false);
    expect(updateEntry).not.toHaveBeenCalled();
  });

  it("rejects an invalid payload without calling the DAL", async () => {
    const result = await updateFoodEntryAction(
      "f1",
      { ...validEdit, quantity: -1 },
      { requireSession: session, updateFoodEntry: updateEntry },
    );

    expect(result.ok).toBe(false);
    expect(updateEntry).not.toHaveBeenCalled();
  });

  it("collapses NotFoundError to a generic not-found message", async () => {
    updateEntry.mockRejectedValue(new NotFoundError());

    const result = await updateFoodEntryAction("missing", validEdit, {
      requireSession: session,
      updateFoodEntry: updateEntry,
    });

    expect(result.ok).toBe(false);
  });

  it("collapses UnauthorizedError (cross-user) to the same generic message as not-found", async () => {
    updateEntry.mockRejectedValue(new UnauthorizedError());

    const result = await updateFoodEntryAction("f1", validEdit, {
      requireSession: session,
      updateFoodEntry: updateEntry,
    });
    const notFoundResult = await updateFoodEntryAction("missing", validEdit, {
      requireSession: session,
      updateFoodEntry: vi.fn().mockRejectedValue(new NotFoundError()),
    });

    expect(result.ok).toBe(false);
    expect(notFoundResult.ok).toBe(false);
    if (!result.ok && !notFoundResult.ok) {
      expect(result.error).toBe(notFoundResult.error);
    }
  });
});

describe("deleteFoodEntryAction (Story 5.2 AC2)", () => {
  it("deletes an owned entry", async () => {
    deleteEntry.mockResolvedValue(undefined);

    const result = await deleteFoodEntryAction("f1", {
      requireSession: session,
      softDeleteFoodEntry: deleteEntry,
    });

    expect(result.ok).toBe(true);
    expect(deleteEntry).toHaveBeenCalledWith("u1", "f1");
  });

  it("requires sign-in", async () => {
    const result = await deleteFoodEntryAction("f1", {
      requireSession: async () => {
        throw new Error("no session");
      },
      softDeleteFoodEntry: deleteEntry,
    });

    expect(result.ok).toBe(false);
    expect(deleteEntry).not.toHaveBeenCalled();
  });

  it("rejects deleting another user's entry (collapsed to not-found)", async () => {
    deleteEntry.mockRejectedValue(new UnauthorizedError());

    const result = await deleteFoodEntryAction("f1", {
      requireSession: session,
      softDeleteFoodEntry: deleteEntry,
    });

    expect(result.ok).toBe(false);
  });
});
