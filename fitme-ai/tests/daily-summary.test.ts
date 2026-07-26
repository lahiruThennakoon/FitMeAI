import { describe, it, expect } from "vitest";
import {
  buildDailySummary,
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
      profile,
      goal,
    });
    expect(summary.intakeKcal).toBe(1800);
    expect(summary.remainingKcal).toBe(2556 - 1800);
    expect(summary.exerciseKcal).toBe(200);
    expect(summary.netKcal).not.toBeNull();
    expect(summary.progress.some((p) => p.key === "proteinG")).toBe(true);
    expect(summary.waterMlTarget).toBe(2450);
    expect(summary.supportiveMessage.length).toBeGreaterThan(10);
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
});
