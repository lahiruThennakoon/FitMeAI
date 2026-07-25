import { describe, it, expect, vi, afterEach } from "vitest";
import { saveProfileAction } from "@/app/actions/profile";

afterEach(() => {
  vi.restoreAllMocks();
});

const validInput = {
  displayName: "Nimali",
  ageYears: 28,
  sex: "female" as const,
  height: 165,
  currentWeight: 62,
  targetWeight: 58,
  activityLevel: "moderately_active" as const,
  dietaryPreferences: [] as string[],
  goalType: "weight_loss" as const,
  preferredUnits: "metric" as const,
  country: "Sri Lanka",
  timezone: "Asia/Colombo",
};

describe("saveProfileAction", () => {
  it("returns fieldErrors without persisting when invalid", async () => {
    const upsert = vi.fn();
    const result = await saveProfileAction(
      { ...validInput, ageYears: 0 },
      {
        requireSession: vi.fn().mockResolvedValue({ id: "u1", email: "a@b.c", name: null }),
        upsertProfileAndGoal: upsert,
      },
    );
    expect(result.ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("persists canonical units and suggested targets", async () => {
    const upsert = vi.fn().mockImplementation(async (_userId, payload) => ({
      profile: payload.profile,
      goal: payload.goal,
    }));

    const result = await saveProfileAction(validInput, {
      requireSession: vi.fn().mockResolvedValue({ id: "u1", email: "a@b.c", name: null }),
      upsertProfileAndGoal: upsert,
    });

    expect(result.ok).toBe(true);
    expect(upsert).toHaveBeenCalledOnce();
    const [, payload] = upsert.mock.calls[0] as [string, { profile: { heightCm: number; currentWeightG: number }; goal: { caloriesKcal: number; bmrKcal: number } }];
    expect(payload.profile.heightCm).toBe(165);
    expect(payload.profile.currentWeightG).toBe(62_000);
    expect(payload.goal.bmrKcal).toBeGreaterThan(0);
    expect(payload.goal.caloriesKcal).toBeGreaterThan(0);
  });

  it("keeps calorie override when provided", async () => {
    const upsert = vi.fn().mockImplementation(async (_userId, payload) => ({
      profile: payload.profile,
      goal: payload.goal,
    }));

    const result = await saveProfileAction(
      { ...validInput, overrides: { caloriesKcal: 1900 } },
      {
        requireSession: vi.fn().mockResolvedValue({ id: "u1", email: "a@b.c", name: null }),
        upsertProfileAndGoal: upsert,
      },
    );

    expect(result.ok).toBe(true);
    const [, payload] = upsert.mock.calls[0] as [
      string,
      { goal: { caloriesKcal: number; overriddenFields: string[] } },
    ];
    expect(payload.goal.caloriesKcal).toBe(1900);
    expect(payload.goal.overriddenFields).toContain("caloriesKcal");
  });
});
