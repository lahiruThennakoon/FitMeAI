import { describe, it, expect, vi, beforeEach } from "vitest";

const findFirstRow = vi.fn();
const updateRow = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    exerciseEntry: {
      findFirst: (...args: unknown[]) => findFirstRow(...args),
      update: (...args: unknown[]) => updateRow(...args),
    },
  },
}));

import {
  getEditableExerciseEntry,
  softDeleteExerciseEntry,
  updateExerciseEntry,
} from "@/lib/dal/exercise-entry";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";

const performedAt = new Date("2026-07-26T08:00:00.000Z");

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "ex1",
    userId: "u1",
    type: "walking",
    customLabel: null,
    durationMin: 30,
    intensity: "moderate",
    estimatedKcal: 123,
    performedAt,
    distanceM: null,
    sets: null,
    reps: null,
    weightG: null,
    notes: null,
    ...overrides,
  };
}

const editedAt = new Date("2026-07-25T18:30:00.000Z");

const editPatch = {
  type: "running" as const,
  customLabel: null,
  durationMin: 45,
  intensity: "high" as const,
  performedAt: editedAt,
  distanceM: 8000,
  sets: null,
  reps: null,
  weightG: null,
  notes: "Felt easy",
  estimatedKcal: 400,
  metUsed: 11.5,
  weightKgUsed: 70,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getEditableExerciseEntry (Story 5.3)", () => {
  it("returns the DTO for an owned entry", async () => {
    findFirstRow.mockResolvedValue(row());

    const dto = await getEditableExerciseEntry("u1", "ex1");

    expect(dto).toEqual({
      id: "ex1",
      type: "walking",
      customLabel: null,
      durationMin: 30,
      intensity: "moderate",
      estimatedKcal: 123,
      performedAt: performedAt.toISOString(),
      distanceM: null,
      sets: null,
      reps: null,
      weightG: null,
      notes: null,
      displayName: "Walking",
    });
  });

  it("throws NotFoundError when the entry is missing or deleted", async () => {
    findFirstRow.mockResolvedValue(null);

    await expect(getEditableExerciseEntry("u1", "missing")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws UnauthorizedError for a cross-user entry", async () => {
    findFirstRow.mockResolvedValue(row({ userId: "other" }));

    await expect(getEditableExerciseEntry("u1", "ex1")).rejects.toThrow(
      UnauthorizedError,
    );
  });
});

describe("updateExerciseEntry (Story 5.3)", () => {
  it("persists core fields, performedAt, details and estimate columns", async () => {
    findFirstRow.mockResolvedValue(row());
    updateRow.mockResolvedValue(
      row({
        type: "running",
        durationMin: 45,
        intensity: "high",
        estimatedKcal: 400,
      }),
    );

    const dto = await updateExerciseEntry("u1", "ex1", editPatch);

    expect(updateRow).toHaveBeenCalledWith({
      where: { id: "ex1" },
      data: {
        type: "running",
        customLabel: null,
        durationMin: 45,
        intensity: "high",
        performedAt: editedAt,
        estimatedKcal: 400,
        metUsed: 11.5,
        weightKgUsed: 70,
        distanceM: 8000,
        sets: null,
        reps: null,
        weightG: null,
        notes: "Felt easy",
      },
    });
    expect(dto.estimatedKcal).toBe(400);
    expect(dto.type).toBe("running");
    expect(dto.displayName).toBe("Running");
  });

  it("rejects cross-user updates before writing", async () => {
    findFirstRow.mockResolvedValue(row({ userId: "other" }));

    await expect(
      updateExerciseEntry("u1", "ex1", editPatch),
    ).rejects.toThrow(UnauthorizedError);
    expect(updateRow).not.toHaveBeenCalled();
  });
});

describe("softDeleteExerciseEntry (Story 5.3)", () => {
  it("sets deletedAt on an owned entry", async () => {
    findFirstRow.mockResolvedValue(row());
    updateRow.mockResolvedValue(row({ deletedAt: new Date() }));

    await softDeleteExerciseEntry("u1", "ex1");

    expect(updateRow).toHaveBeenCalledWith({
      where: { id: "ex1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("throws NotFoundError when missing (no silent no-op)", async () => {
    findFirstRow.mockResolvedValue(null);

    await expect(softDeleteExerciseEntry("u1", "missing")).rejects.toThrow(
      NotFoundError,
    );
    expect(updateRow).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedError for cross-user", async () => {
    findFirstRow.mockResolvedValue(row({ userId: "other" }));

    await expect(softDeleteExerciseEntry("u1", "ex1")).rejects.toThrow(
      UnauthorizedError,
    );
    expect(updateRow).not.toHaveBeenCalled();
  });
});
