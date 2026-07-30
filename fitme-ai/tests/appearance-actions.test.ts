import { describe, it, expect, vi, afterEach } from "vitest";
import { saveAppearancePreferenceAction } from "@/app/actions/appearance";

afterEach(() => {
  vi.restoreAllMocks();
});

const session = () =>
  vi.fn().mockResolvedValue({ id: "u1", email: "a@b.c", name: null });

const savedProfile = {
  displayName: "Nimali",
  ageYears: 28,
  sex: "female" as const,
  heightCm: 165,
  currentWeightG: 62_000,
  targetWeightG: 58_000,
  activityLevel: "moderately_active" as const,
  dietaryPreferences: [],
  goalType: "weight_loss" as const,
  preferredUnits: "metric" as const,
  preferredGlucoseUnit: "mg_dl" as const,
  eatBackExercise: false,
  notifyFastingEnd: false,
  notifyWeeklyDigest: false,
  appearancePreference: "dark" as const,
  country: "",
  timezone: "Asia/Colombo",
};

describe("saveAppearancePreferenceAction", () => {
  it("persists dark mode to the profile", async () => {
    const update = vi.fn().mockResolvedValue(savedProfile);
    const result = await saveAppearancePreferenceAction(
      { appearancePreference: "dark" },
      {
        requireSession: session(),
        updateAppearancePreference: update,
        revalidate: vi.fn(),
      },
    );

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith("u1", "dark");
  });

  it("succeeds without a profile row", async () => {
    const update = vi.fn().mockResolvedValue(null);
    const result = await saveAppearancePreferenceAction(
      { appearancePreference: "light" },
      {
        requireSession: session(),
        updateAppearancePreference: update,
        revalidate: vi.fn(),
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.profile).toBeNull();
  });

  it("accepts unsigned requests as local-only ok", async () => {
    const result = await saveAppearancePreferenceAction(
      { appearancePreference: "system" },
      {
        requireSession: async () => {
          throw new Error("no session");
        },
        updateAppearancePreference: vi.fn(),
        revalidate: vi.fn(),
      },
    );

    expect(result.ok).toBe(true);
  });
});
