import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deleteExerciseEntryAction,
  updateExerciseEntryAction,
} from "@/app/actions/exercise";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";

const updateEntry = vi.fn();
const deleteEntry = vi.fn();
const getProfile = vi.fn();

const session = async () =>
  ({ id: "u1", email: "a@b.com", name: null }) as never;

const validEdit = {
  type: "walking" as const,
  durationMin: 45,
  intensity: "moderate" as const,
  customLabel: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  getProfile.mockResolvedValue({
    currentWeightG: 70_000,
    heightCm: 175,
    ageYears: 30,
    sex: "male",
    activityLevel: "moderately_active",
  });
  updateEntry.mockImplementation(
    async (_userId: string, id: string, patch: Record<string, unknown>) => ({
      id,
      type: patch.type,
      customLabel: patch.customLabel ?? null,
      durationMin: patch.durationMin,
      intensity: patch.intensity,
      estimatedKcal: patch.estimatedKcal,
      performedAt: new Date().toISOString(),
      displayName: "Walking",
    }),
  );
});

describe("updateExerciseEntryAction (Story 5.3 AC1/AC2)", () => {
  it("saves a valid edit and recomputes estimate", async () => {
    const result = await updateExerciseEntryAction("ex1", validEdit, {
      requireSession: session,
      getProfileForUser: getProfile,
      updateExerciseEntry: updateEntry,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.estimateLabeled).toBe(true);
      expect(result.data.entry.durationMin).toBe(45);
      expect(result.data.entry.estimatedKcal).toBeGreaterThan(0);
    }
    expect(updateEntry).toHaveBeenCalledWith(
      "u1",
      "ex1",
      expect.objectContaining({
        type: "walking",
        durationMin: 45,
        intensity: "moderate",
        estimatedKcal: expect.any(Number),
        metUsed: expect.any(Number),
        weightKgUsed: expect.any(Number),
      }),
    );
  });

  it("increases kcal when duration increases (same type/intensity/weight)", async () => {
    const short = await updateExerciseEntryAction(
      "ex1",
      { ...validEdit, durationMin: 30 },
      {
        requireSession: session,
        getProfileForUser: getProfile,
        updateExerciseEntry: updateEntry,
      },
    );
    const long = await updateExerciseEntryAction(
      "ex1",
      { ...validEdit, durationMin: 60 },
      {
        requireSession: session,
        getProfileForUser: getProfile,
        updateExerciseEntry: updateEntry,
      },
    );

    expect(short.ok && long.ok).toBe(true);
    if (short.ok && long.ok) {
      expect(long.data.entry.estimatedKcal).toBeGreaterThan(
        short.data.entry.estimatedKcal,
      );
    }
  });

  it("requires sign-in", async () => {
    const result = await updateExerciseEntryAction("ex1", validEdit, {
      requireSession: async () => {
        throw new Error("no session");
      },
      getProfileForUser: getProfile,
      updateExerciseEntry: updateEntry,
    });

    expect(result.ok).toBe(false);
    expect(updateEntry).not.toHaveBeenCalled();
  });

  it("rejects zero duration without calling the DAL", async () => {
    const result = await updateExerciseEntryAction(
      "ex1",
      { ...validEdit, durationMin: 0 },
      {
        requireSession: session,
        getProfileForUser: getProfile,
        updateExerciseEntry: updateEntry,
      },
    );

    expect(result.ok).toBe(false);
    expect(updateEntry).not.toHaveBeenCalled();
  });

  it("rejects fractional duration that would round to zero", async () => {
    const result = await updateExerciseEntryAction(
      "ex1",
      { ...validEdit, durationMin: 0.4 },
      {
        requireSession: session,
        getProfileForUser: getProfile,
        updateExerciseEntry: updateEntry,
      },
    );

    expect(result.ok).toBe(false);
    expect(updateEntry).not.toHaveBeenCalled();
  });

  it("rejects custom type without a label and returns fieldErrors", async () => {
    const result = await updateExerciseEntryAction(
      "ex1",
      {
        type: "custom",
        durationMin: 20,
        intensity: "high",
        customLabel: "",
      },
      {
        requireSession: session,
        getProfileForUser: getProfile,
        updateExerciseEntry: updateEntry,
      },
    );

    expect(result.ok).toBe(false);
    expect(updateEntry).not.toHaveBeenCalled();
    if (!result.ok) {
      expect(result.fieldErrors?.customLabel).toBeTruthy();
    }
  });

  it("collapses NotFoundError and UnauthorizedError to the same message", async () => {
    updateEntry.mockRejectedValueOnce(new NotFoundError());
    const notFound = await updateExerciseEntryAction("missing", validEdit, {
      requireSession: session,
      getProfileForUser: getProfile,
      updateExerciseEntry: updateEntry,
    });

    updateEntry.mockRejectedValueOnce(new UnauthorizedError());
    const forbidden = await updateExerciseEntryAction("ex1", validEdit, {
      requireSession: session,
      getProfileForUser: getProfile,
      updateExerciseEntry: updateEntry,
    });

    expect(notFound.ok).toBe(false);
    expect(forbidden.ok).toBe(false);
    if (!notFound.ok && !forbidden.ok) {
      expect(notFound.error).toBe(forbidden.error);
    }
  });
});

describe("deleteExerciseEntryAction (Story 5.3 AC3)", () => {
  it("deletes an owned entry", async () => {
    deleteEntry.mockResolvedValue(undefined);

    const result = await deleteExerciseEntryAction("ex1", {
      requireSession: session,
      softDeleteExerciseEntry: deleteEntry,
    });

    expect(result.ok).toBe(true);
    expect(deleteEntry).toHaveBeenCalledWith("u1", "ex1");
  });

  it("requires sign-in", async () => {
    const result = await deleteExerciseEntryAction("ex1", {
      requireSession: async () => {
        throw new Error("no session");
      },
      softDeleteExerciseEntry: deleteEntry,
    });

    expect(result.ok).toBe(false);
    expect(deleteEntry).not.toHaveBeenCalled();
  });

  it("collapses ownership failures to a generic not-found message", async () => {
    deleteEntry.mockRejectedValueOnce(new UnauthorizedError());
    const forbidden = await deleteExerciseEntryAction("ex1", {
      requireSession: session,
      softDeleteExerciseEntry: deleteEntry,
    });

    deleteEntry.mockRejectedValueOnce(new NotFoundError());
    const notFound = await deleteExerciseEntryAction("missing", {
      requireSession: session,
      softDeleteExerciseEntry: deleteEntry,
    });

    expect(forbidden.ok).toBe(false);
    expect(notFound.ok).toBe(false);
    if (!forbidden.ok && !notFound.ok) {
      expect(forbidden.error).toBe(notFound.error);
    }
  });
});
