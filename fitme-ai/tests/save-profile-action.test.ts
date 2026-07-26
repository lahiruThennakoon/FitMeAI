import { describe, it, expect, vi, afterEach } from "vitest";
import { saveProfileAction } from "@/app/actions/profile";
import { SAFETY_CONSENT_REQUIRED_ERROR } from "@/lib/domain/safety/ladder";

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

function mockUpsert() {
  return vi.fn().mockImplementation(async (_userId, payload) => ({
    profile: payload.profile,
    goal: {
      ...payload.goal,
      safetyConsentAt: payload.goal.safetyConsentAt
        ? payload.goal.safetyConsentAt.toISOString()
        : null,
    },
  }));
}

describe("saveProfileAction", () => {
  it("returns fieldErrors without persisting when invalid", async () => {
    const upsert = vi.fn();
    const result = await saveProfileAction(
      { ...validInput, ageYears: 0 },
      {
        requireSession: vi.fn().mockResolvedValue({
          id: "u1",
          email: "a@b.c",
          name: null,
        }),
        upsertProfileAndGoal: upsert,
      },
    );
    expect(result.ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("persists canonical units and suggested targets", async () => {
    const upsert = mockUpsert();

    const result = await saveProfileAction(validInput, {
      requireSession: vi.fn().mockResolvedValue({
        id: "u1",
        email: "a@b.c",
        name: null,
      }),
      upsertProfileAndGoal: upsert,
    });

    expect(result.ok).toBe(true);
    expect(upsert).toHaveBeenCalledOnce();
    const [, payload] = upsert.mock.calls[0] as [
      string,
      {
        profile: { heightCm: number; currentWeightG: number };
        goal: { caloriesKcal: number; bmrKcal: number; safetyLevel: string };
      },
    ];
    expect(payload.profile.heightCm).toBe(165);
    expect(payload.profile.currentWeightG).toBe(62_000);
    expect(payload.goal.bmrKcal).toBeGreaterThan(0);
    expect(payload.goal.caloriesKcal).toBeGreaterThan(0);
    expect(["green", "yellow", "red"]).toContain(payload.goal.safetyLevel);
  });

  it("keeps calorie override when provided", async () => {
    const upsert = mockUpsert();

    const result = await saveProfileAction(
      { ...validInput, overrides: { caloriesKcal: 1900 } },
      {
        requireSession: vi.fn().mockResolvedValue({
          id: "u1",
          email: "a@b.c",
          name: null,
        }),
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

  it("blocks red targets without safety consent", async () => {
    const upsert = mockUpsert();
    const result = await saveProfileAction(
      {
        ...validInput,
        overrides: { caloriesKcal: 1100 },
        safetyConsent: false,
      },
      {
        requireSession: vi.fn().mockResolvedValue({
          id: "u1",
          email: "a@b.c",
          name: null,
        }),
        upsertProfileAndGoal: upsert,
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(SAFETY_CONSENT_REQUIRED_ERROR);
    }
    expect(upsert).not.toHaveBeenCalled();
  });

  it("saves red targets when consent is given and records the decision", async () => {
    const upsert = mockUpsert();
    const result = await saveProfileAction(
      {
        ...validInput,
        overrides: { caloriesKcal: 1100 },
        safetyConsent: true,
      },
      {
        requireSession: vi.fn().mockResolvedValue({
          id: "u1",
          email: "a@b.c",
          name: null,
        }),
        upsertProfileAndGoal: upsert,
      },
    );
    expect(result.ok).toBe(true);
    const [, payload] = upsert.mock.calls[0] as [
      string,
      {
        goal: {
          safetyLevel: string;
          safetyConsentGiven: boolean;
          safetyConsentAt: Date | null;
          safetyReasons: string[];
        };
      },
    ];
    expect(payload.goal.safetyLevel).toBe("red");
    expect(payload.goal.safetyConsentGiven).toBe(true);
    expect(payload.goal.safetyConsentAt).toBeInstanceOf(Date);
    expect(payload.goal.safetyReasons.length).toBeGreaterThan(0);
  });

  it("allows yellow targets without safety consent", async () => {
    const upsert = mockUpsert();
    // Aggressive deficit above the hard floor → yellow, not red.
    const result = await saveProfileAction(
      {
        ...validInput,
        goalType: "maintenance",
        currentWeight: 62,
        targetWeight: 62,
        overrides: {
          caloriesKcal: 1600,
          weeklyWeightChangeG: 0,
        },
        safetyConsent: false,
      },
      {
        requireSession: vi.fn().mockResolvedValue({
          id: "u1",
          email: "a@b.c",
          name: null,
        }),
        upsertProfileAndGoal: upsert,
      },
    );
    expect(result.ok).toBe(true);
    const [, payload] = upsert.mock.calls[0] as [
      string,
      {
        goal: {
          safetyLevel: string;
          safetyConsentGiven: boolean;
          safetyConsentAt: Date | null;
        };
      },
    ];
    expect(payload.goal.safetyLevel).toBe("yellow");
    expect(payload.goal.safetyConsentGiven).toBe(false);
    expect(payload.goal.safetyConsentAt).toBeNull();
  });

  it("clears consent fields when saving safer non-red targets", async () => {
    const upsert = mockUpsert();
    const session = {
      requireSession: vi.fn().mockResolvedValue({
        id: "u1",
        email: "a@b.c",
        name: null,
      }),
      upsertProfileAndGoal: upsert,
    };

    await saveProfileAction(
      {
        ...validInput,
        overrides: { caloriesKcal: 1100 },
        safetyConsent: true,
      },
      session,
    );

    const safe = await saveProfileAction(
      {
        ...validInput,
        goalType: "maintenance",
        currentWeight: 62,
        targetWeight: 62,
        overrides: {
          caloriesKcal: 2200,
          weeklyWeightChangeG: 0,
        },
        safetyConsent: false,
      },
      session,
    );

    expect(safe.ok).toBe(true);
    const [, payload] = upsert.mock.calls[1] as [
      string,
      {
        goal: {
          safetyLevel: string;
          safetyConsentGiven: boolean;
          safetyConsentAt: Date | null;
        };
      },
    ];
    expect(payload.goal.safetyLevel).toBe("green");
    expect(payload.goal.safetyConsentGiven).toBe(false);
    expect(payload.goal.safetyConsentAt).toBeNull();
  });
});
