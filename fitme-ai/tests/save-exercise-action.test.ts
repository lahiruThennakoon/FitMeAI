import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveExerciseEntryAction } from "@/app/actions/exercise";

const createEntry = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  createEntry.mockResolvedValue({
    id: "ex-1",
    type: "walking",
    customLabel: null,
    durationMin: 30,
    intensity: "moderate",
    estimatedKcal: 123,
    performedAt: new Date().toISOString(),
    displayName: "Walking",
  });
});

describe("saveExerciseEntryAction (FR-14)", () => {
  it("saves with labeled estimate", async () => {
    const result = await saveExerciseEntryAction(
      {
        type: "walking",
        durationMin: 30,
        intensity: "moderate",
      },
      {
        requireSession: async () =>
          ({ id: "u1", email: "a@b.com", name: null }) as never,
        getProfileForUser: async () =>
          ({
            currentWeightG: 70_000,
            heightCm: 175,
            ageYears: 30,
            sex: "male",
            activityLevel: "moderately_active",
          }) as never,
        createExerciseEntry: createEntry,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.estimateLabeled).toBe(true);
      expect(result.data.entry.estimatedKcal).toBe(123);
    }
    expect(createEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        type: "walking",
        durationMin: 30,
        estimatedKcal: expect.any(Number),
        metUsed: expect.any(Number),
      }),
    );
  });

  it("persists custom exercise label", async () => {
    createEntry.mockResolvedValue({
      id: "ex-2",
      type: "custom",
      customLabel: "Boxing bag",
      durationMin: 25,
      intensity: "high",
      estimatedKcal: 200,
      performedAt: new Date().toISOString(),
      displayName: "Boxing bag",
    });

    const result = await saveExerciseEntryAction(
      {
        type: "custom",
        customLabel: "Boxing bag",
        durationMin: 25,
        intensity: "high",
      },
      {
        requireSession: async () =>
          ({ id: "u1", email: "a@b.com", name: null }) as never,
        getProfileForUser: async () => null,
        createExerciseEntry: createEntry,
      },
    );

    expect(result.ok).toBe(true);
    expect(createEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "custom",
        customLabel: "Boxing bag",
      }),
    );
  });

  it("rejects zero duration", async () => {
    const result = await saveExerciseEntryAction(
      { type: "running", durationMin: 0, intensity: "moderate" },
      {
        requireSession: async () =>
          ({ id: "u1", email: "a@b.com", name: null }) as never,
        createExerciseEntry: createEntry,
      },
    );
    expect(result.ok).toBe(false);
    expect(createEntry).not.toHaveBeenCalled();
  });
});
