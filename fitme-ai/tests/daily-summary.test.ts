import { describe, it, expect } from "vitest";
import {
  buildDailySummary,
  describeEnergyBalance,
  DEFAULT_WATER_ML_TARGET,
  sugarLimitFromCalories,
  sumMacros,
  supportiveDashboardMessage,
} from "@/lib/domain/dashboard/daily-summary";
import type { GoalDto, ProfileDto } from "@/lib/domain/targets/types";

const profile: ProfileDto = {
  displayName: "Alex",
  ageYears: 30,
  sex: "male",
  heightCm: 175,
  currentWeightG: 70_000,
  targetWeightG: 70_000,
  activityLevel: "moderately_active",
  dietaryPreferences: [],
  goalType: "maintenance",
  preferredUnits: "metric",
  country: "LK",
  timezone: "Asia/Colombo",
};

const goal: GoalDto = {
  bmrKcal: 1649,
  tdeeKcal: 2556,
  caloriesKcal: 2556,
  proteinG: 140,
  carbsG: 280,
  fatG: 70,
  fibreG: 30,
  waterMl: 2450,
  steps: 8000,
  exerciseMinutes: 30,
  weeklyWeightChangeG: 0,
  overriddenFields: [],
  safetyLevel: "green",
  safetyReasons: [],
  safetyConsentGiven: false,
  safetyConsentAt: null,
};

describe("daily summary (FR-15)", () => {
  it("sums macros from food entries", () => {
    const macros = sumMacros([
      {
        energyKcal: 400,
        proteinG: 20,
        carbsG: 40,
        fatG: 10,
        fibreG: 5,
        sugarG: 8,
        sodiumMg: 200,
      },
      {
        energyKcal: 200,
        proteinG: 10,
        carbsG: 20,
        fatG: 5,
        fibreG: 2,
        sugarG: 4,
        sodiumMg: 100,
      },
    ]);
    expect(macros.energyKcal).toBe(600);
    expect(macros.proteinG).toBe(30);
  });

  it("builds summary with targets, remaining, and net", () => {
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [
        {
          energyKcal: 1800,
          proteinG: 90,
          carbsG: 180,
          fatG: 50,
          fibreG: 20,
          sugarG: 30,
          sodiumMg: 1500,
        },
      ],
      exerciseKcal: 200,
      waterMlConsumed: 1200,
      profile,
      goal,
    });
    expect(summary.intakeKcal).toBe(1800);
    expect(summary.remainingKcal).toBe(2556 - 1800);
    expect(summary.exerciseKcal).toBe(200);
    expect(summary.netKcal).not.toBeNull();
    expect(summary.progress.some((p) => p.key === "proteinG")).toBe(true);
    expect(summary.waterMlConsumed).toBe(1200);
    expect(summary.waterMlTarget).toBe(2450);
    expect(summary.waterMlTargetIsDefault).toBe(false);
    expect(summary.preferredUnits).toBe("metric");
    expect(summary.supportiveMessage.length).toBeGreaterThan(10);
  });

  it("falls back to a soft default water aim when there is no goal", () => {
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [],
      exerciseKcal: 0,
      profile,
      goal: null,
    });
    expect(summary.waterMlConsumed).toBe(0);
    expect(summary.waterMlTarget).toBe(DEFAULT_WATER_ML_TARGET);
    expect(summary.waterMlTargetIsDefault).toBe(true);
  });

  it("carries preferredUnits through for display-only conversion (AC7)", () => {
    const imperialProfile: ProfileDto = { ...profile, preferredUnits: "imperial" };
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [],
      exerciseKcal: 0,
      profile: imperialProfile,
      goal: null,
    });
    expect(summary.preferredUnits).toBe("imperial");
    // Canonical storage stays ml regardless of display units (AD-11).
    expect(summary.waterMlTarget).toBe(DEFAULT_WATER_ML_TARGET);
  });

  it("works without a goal (intake vs burn still meaningful)", () => {
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [
        {
          energyKcal: 500,
          proteinG: 20,
          carbsG: 40,
          fatG: 10,
          fibreG: 4,
          sugarG: 5,
          sodiumMg: 100,
        },
      ],
      exerciseKcal: 0,
      profile,
      goal: null,
    });
    expect(summary.hasGoal).toBe(false);
    expect(summary.targetKcal).toBeNull();
    expect(summary.netKcal).not.toBeNull();
    expect(summary.supportiveMessage).toMatch(/targets|burn|logging/i);
  });

  it("uses supportive empty-state copy (no guilt)", () => {
    const msg = supportiveDashboardMessage({
      mealCount: 0,
      remainingKcal: null,
      hasGoal: true,
      hasProfile: true,
    });
    expect(msg.toLowerCase()).not.toMatch(/fail|lazy|shame|should have/);
    expect(msg).toMatch(/ready|clearly|whenever/i);
  });

  it("describes negative net as room left — not a signed puzzle", () => {
    const under = describeEnergyBalance(-900);
    expect(under.kind).toBe("under");
    expect(under.gapKcal).toBe(900);
    expect(under.statusLabel).toBe("Room left");
    expect(under.explanation).toBe("You still have 900 kcal to eat.");
    expect(under.explanation.toLowerCase()).not.toMatch(/fail|bad|wrong|deficit/);

    const over = describeEnergyBalance(400);
    expect(over.kind).toBe("over");
    expect(over.statusLabel).toBe("Above burn");
    expect(over.explanation).toBe("You've logged 400 kcal more than burn.");

    const even = describeEnergyBalance(10);
    expect(even.kind).toBe("even");
    expect(even.statusLabel).toBe("On track");
    expect(even.explanation).toBe("Food and burn are about even.");
  });

  it("derives a soft sugar aim from calorie target", () => {
    expect(sugarLimitFromCalories(2000)).toBe(50);
    expect(sugarLimitFromCalories(null)).toBeNull();

    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [
        {
          energyKcal: 500,
          proteinG: 20,
          carbsG: 40,
          fatG: 10,
          fibreG: 4,
          sugarG: 12,
          sodiumMg: 100,
        },
      ],
      exerciseKcal: 0,
      profile,
      goal,
    });
    const sugar = summary.progress.find((p) => p.key === "sugarG");
    expect(sugar?.target).toBe(Math.round((2556 * 0.1) / 4));
    expect(sugar?.ratio).not.toBeNull();
  });
});

