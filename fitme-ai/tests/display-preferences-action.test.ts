import { describe, it, expect, vi, afterEach } from "vitest";
import {
  PROFILE_REQUIRED_ERROR,
  saveDisplayPreferencesAction,
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
  preferredUnits: "imperial" as const,
  preferredGlucoseUnit: "mmol_l" as const,
  eatBackExercise: false,
  notifyFastingEnd: false,
  notifyWeeklyDigest: false,
  appearancePreference: "system" as const,
  country: "Sri Lanka",
  timezone: "Asia/Colombo",
};

const validInput = {
  preferredUnits: "imperial" as const,
  preferredGlucoseUnit: "mmol_l" as const,
  timezone: "Asia/Colombo",
};

describe("saveDisplayPreferencesAction", () => {
  it("saves units, glucose unit, and timezone without touching targets", async () => {
    const update = vi.fn().mockResolvedValue(savedProfile);
    const result = await saveDisplayPreferencesAction(validInput, {
      requireSession: session(),
      updateDisplayPreferences: update,
      revalidate: vi.fn(),
    });

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith("u1", validInput);
    // Nothing here can move a stored gram or millilitre.
    const [, patch] = update.mock.calls[0] as [string, Record<string, unknown>];
    expect(Object.keys(patch).sort()).toEqual([
      "preferredGlucoseUnit",
      "preferredUnits",
      "timezone",
    ]);
  });

  it("refreshes every dated view because the timezone moves day boundaries", async () => {
    const revalidate = vi.fn();
    await saveDisplayPreferencesAction(validInput, {
      requireSession: session(),
      updateDisplayPreferences: vi.fn().mockResolvedValue(savedProfile),
      revalidate,
    });

    const paths = revalidate.mock.calls.map(([p]) => p);
    expect(paths).toContain("/dashboard");
    expect(paths).toContain("/progress");
  });

  it("rejects a timezone the runtime doesn't know", async () => {
    const update = vi.fn();
    const result = await saveDisplayPreferencesAction(
      { ...validInput, timezone: "Mars/Olympus_Mons" },
      {
        requireSession: session(),
        updateDisplayPreferences: update,
        revalidate: vi.fn(),
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.timezone).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects an unknown unit system", async () => {
    const update = vi.fn();
    const result = await saveDisplayPreferencesAction(
      { ...validInput, preferredUnits: "stones" },
      {
        requireSession: session(),
        updateDisplayPreferences: update,
        revalidate: vi.fn(),
      },
    );
    expect(result.ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("defaults the glucose unit rather than failing when it is absent", async () => {
    const update = vi.fn().mockResolvedValue(savedProfile);
    const result = await saveDisplayPreferencesAction(
      { preferredUnits: "metric", timezone: "Asia/Colombo" },
      {
        requireSession: session(),
        updateDisplayPreferences: update,
        revalidate: vi.fn(),
      },
    );
    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith("u1", {
      preferredUnits: "metric",
      preferredGlucoseUnit: "mg_dl",
      timezone: "Asia/Colombo",
    });
  });

  it("points the user at the profile when there is no profile row yet", async () => {
    const result = await saveDisplayPreferencesAction(validInput, {
      requireSession: session(),
      updateDisplayPreferences: vi.fn().mockResolvedValue(null),
      revalidate: vi.fn(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(PROFILE_REQUIRED_ERROR);
  });

  it("refuses when there is no session", async () => {
    const update = vi.fn();
    const result = await saveDisplayPreferencesAction(validInput, {
      requireSession: vi.fn().mockRejectedValue(new Error("no session")),
      updateDisplayPreferences: update,
      revalidate: vi.fn(),
    });
    expect(result.ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("does not revalidate when the write fails", async () => {
    const revalidate = vi.fn();
    const result = await saveDisplayPreferencesAction(validInput, {
      requireSession: session(),
      updateDisplayPreferences: vi.fn().mockRejectedValue(new Error("db down")),
      revalidate,
    });
    expect(result.ok).toBe(false);
    expect(revalidate).not.toHaveBeenCalled();
  });
});
