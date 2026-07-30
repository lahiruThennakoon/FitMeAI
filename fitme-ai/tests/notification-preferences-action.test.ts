import { describe, it, expect, vi, afterEach } from "vitest";
import {
  PROFILE_REQUIRED_ERROR,
  saveNotificationPreferencesAction,
} from "@/app/actions/profile";

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
  notifyFastingEnd: true,
  notifyWeeklyDigest: false,
  appearancePreference: "system" as const,
  country: "",
  timezone: "Asia/Colombo",
};

describe("saveNotificationPreferencesAction (Tier 3)", () => {
  it("persists reminder toggles", async () => {
    const update = vi.fn().mockResolvedValue(savedProfile);
    const result = await saveNotificationPreferencesAction(
      { notifyFastingEnd: true, notifyWeeklyDigest: false },
      {
        requireSession: session(),
        updateNotificationPreferences: update,
        revalidate: vi.fn(),
      },
    );

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith("u1", {
      notifyFastingEnd: true,
      notifyWeeklyDigest: false,
    });
  });

  it("requires a profile", async () => {
    const update = vi.fn().mockResolvedValue(null);
    const result = await saveNotificationPreferencesAction(
      { notifyFastingEnd: false, notifyWeeklyDigest: false },
      {
        requireSession: session(),
        updateNotificationPreferences: update,
        revalidate: vi.fn(),
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(PROFILE_REQUIRED_ERROR);
  });
});
