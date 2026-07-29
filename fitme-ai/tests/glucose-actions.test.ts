import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireSession, createGlucoseEntry, updateGlucoseEntry, softDeleteGlucoseEntry } =
  vi.hoisted(() => ({
    requireSession: vi.fn(),
    createGlucoseEntry: vi.fn(),
    updateGlucoseEntry: vi.fn(),
    softDeleteGlucoseEntry: vi.fn(),
  }));

vi.mock("@/lib/dal", () => ({ requireSession }));
vi.mock("@/lib/dal/glucose-entry", () => ({
  createGlucoseEntry,
  updateGlucoseEntry,
  softDeleteGlucoseEntry,
}));
vi.mock("@/lib/logging", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import {
  createGlucoseEntryAction,
  deleteGlucoseEntryAction,
  updateGlucoseEntryAction,
} from "@/app/actions/glucose";
import { NotFoundError } from "@/lib/dal/guards";

beforeEach(() => {
  vi.clearAllMocks();
  requireSession.mockResolvedValue({ id: "u1", email: "a@b.c", name: null });
});

describe("createGlucoseEntryAction (Story 8.1)", () => {
  it("stores canonical mg/dL from mmol input", async () => {
    createGlucoseEntry.mockResolvedValue({
      id: "g1",
      valueMgDl: 90,
      measuredAt: "2026-07-27T08:00:00.000Z",
      context: "fasting",
      note: null,
    });

    const result = await createGlucoseEntryAction({
      value: 5,
      unit: "mmol_l",
      context: "fasting",
    });

    expect(result.ok).toBe(true);
    expect(createGlucoseEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        valueMgDl: expect.closeTo(90.09, 0),
        context: "fasting",
      }),
    );
  });

  it("rejects implausible values before hitting the DAL", async () => {
    const result = await createGlucoseEntryAction({
      value: 99999,
      unit: "mg_dl",
      context: "other",
    });

    expect(result.ok).toBe(false);
    expect(createGlucoseEntry).not.toHaveBeenCalled();
  });

  it("rejects future timestamps", async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = await createGlucoseEntryAction({
      value: 100,
      unit: "mg_dl",
      context: "other",
      measuredAt: tomorrow.toISOString(),
    });

    expect(result.ok).toBe(false);
    expect(createGlucoseEntry).not.toHaveBeenCalled();
  });
});

describe("updateGlucoseEntryAction (Story 8.3)", () => {
  it("returns not found message", async () => {
    updateGlucoseEntry.mockRejectedValue(new NotFoundError());

    const result = await updateGlucoseEntryAction({
      id: "missing",
      value: 100,
      unit: "mg_dl",
      context: "other",
      measuredAt: "2026-07-27T08:00:00.000Z",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/wasn't found/i);
    }
  });
});

describe("deleteGlucoseEntryAction (Story 8.3)", () => {
  it("soft-deletes owned entry", async () => {
    softDeleteGlucoseEntry.mockResolvedValue(undefined);

    const result = await deleteGlucoseEntryAction({ id: "g1" });
    expect(result.ok).toBe(true);
    expect(softDeleteGlucoseEntry).toHaveBeenCalledWith("u1", "g1");
  });
});
