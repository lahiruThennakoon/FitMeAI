import { describe, it, expect } from "vitest";
import {
  buildDailySummary,
  computeFoodBudgetKcal,
  computeRemainingKcal,
  describeEnergyBalance,
  describeRemainingBasis,
  DEFAULT_WATER_ML_TARGET,
  SODIUM_LIMIT_MG,
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
  preferredGlucoseUnit: "mg_dl",
  eatBackExercise: false,
  notifyFastingEnd: false,
  notifyWeeklyDigest: false,
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

  it("describes negative net as below burn — not food-budget remaining", () => {
    const under = describeEnergyBalance(-900);
    expect(under.kind).toBe("under");
    expect(under.gapKcal).toBe(900);
    expect(under.statusLabel).toBe("Below burn");
    expect(under.explanation).toBe("Food is 900 kcal below estimated burn.");
    expect(under.explanation.toLowerCase()).not.toMatch(/to eat|fail|bad|wrong/);

    const over = describeEnergyBalance(400);
    expect(over.kind).toBe("over");
    expect(over.statusLabel).toBe("Above burn");
    expect(over.explanation).toBe("You've logged 400 kcal more than burn.");

    const exact = describeEnergyBalance(0);
    expect(exact.kind).toBe("even");
    expect(exact.gapKcal).toBe(0);
    expect(exact.statusLabel).toBe("On track");
    expect(exact.explanation).toBe("Food and burn match today.");

    const close = describeEnergyBalance(8);
    expect(close.kind).toBe("even");
    expect(close.gapKcal).toBe(8);
    expect(close.statusLabel).toBe("Close");
    expect(close.explanation).toContain("8 kcal above burn");

    const notClose = describeEnergyBalance(34, {
      intakeKcal: 2785,
      burnKcal: 2751,
    });
    expect(notClose.kind).toBe("over");
    expect(notClose.gapKcal).toBe(34);
    expect(notClose.explanation).toBe("You've logged 34 kcal more than burn.");
  });

  it("computeRemainingKcal is the single food-budget source of truth", () => {
    expect(computeRemainingKcal(2556, 1800)).toBe(756);
    expect(computeRemainingKcal(null, 500)).toBeNull();
  });

  it("remaining and net energy never contradict as eatable calories", () => {
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [
        {
          energyKcal: 900,
          proteinG: 40,
          carbsG: 90,
          fatG: 25,
          fibreG: 10,
          sugarG: 12,
          sodiumMg: 400,
        },
      ],
      exerciseKcal: 150,
      waterMlConsumed: 1000,
      profile,
      goal,
    });
    const remaining = computeRemainingKcal(summary.targetKcal, summary.intakeKcal);
    expect(summary.remainingKcal).toBe(remaining);
    expect(remaining).toBe(2556 - 900);

    const balance = describeEnergyBalance(summary.netKcal!);
    if (balance.kind === "under") {
      expect(balance.explanation).not.toMatch(/to eat/i);
      expect(balance.gapKcal).not.toBe(Math.abs(remaining!));
    }
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

  it("surfaces sodium against the WHO soft aim, labelled as not the user's goal", () => {
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
          sodiumMg: 2400,
        },
      ],
      exerciseKcal: 0,
      profile,
      goal,
    });
    const sodium = summary.progress.find((p) => p.key === "sodiumMg");
    expect(sodium?.consumed).toBe(2400);
    expect(sodium?.target).toBe(SODIUM_LIMIT_MG);
    expect(sodium?.unit).toBe("mg");
    expect(sodium?.targetNote).toMatch(/not from your goal/i);
  });
});

describe("food budget and the Remaining/Burn bridge", () => {
  const withEatBack: ProfileDto = { ...profile, eatBackExercise: true };

  it("ignores exercise by default so the target isn't double-counted", () => {
    expect(computeFoodBudgetKcal(2556, { exerciseKcal: 300 })).toBe(2556);
    expect(computeRemainingKcal(2556, 1800, { exerciseKcal: 300 })).toBe(756);
  });

  it("credits exercise when the user opts in", () => {
    expect(
      computeFoodBudgetKcal(2556, { exerciseKcal: 300, eatBackExercise: true }),
    ).toBe(2856);
    expect(
      computeRemainingKcal(2556, 1800, {
        exerciseKcal: 300,
        eatBackExercise: true,
      }),
    ).toBe(1056);
  });

  it("has no budget without a calorie target", () => {
    expect(computeFoodBudgetKcal(null, { exerciseKcal: 300 })).toBeNull();
    expect(computeRemainingKcal(null, 500)).toBeNull();
  });

  it("threads the preference through the summary and the calories meter", () => {
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
      exerciseKcal: 400,
      profile: withEatBack,
      goal,
    });

    expect(summary.eatBackExercise).toBe(true);
    expect(summary.foodBudgetKcal).toBe(2556 + 400);
    expect(summary.remainingKcal).toBe(2556 + 400 - 1800);
    // The calories meter counts down from the same number as Remaining.
    const calories = summary.progress.find((p) => p.key === "calories");
    expect(calories?.target).toBe(2956);
  });

  it("explains why exercise didn't move Remaining", () => {
    const basis = describeRemainingBasis({
      exerciseKcal: 180,
      eatBackExercise: false,
      hasTarget: true,
    });
    expect(basis).toContain("180 kcal");
    expect(basis).toMatch(/already assumes/i);
    expect(basis).toMatch(/energy balance/i);
  });

  it("explains the credit when eat-back is on", () => {
    const basis = describeRemainingBasis({
      exerciseKcal: 180,
      eatBackExercise: true,
      hasTarget: true,
    });
    expect(basis).toMatch(/target \+ today's 180 kcal/i);
  });

  it("says nothing when there's no target to explain", () => {
    expect(
      describeRemainingBasis({
        exerciseKcal: 180,
        eatBackExercise: false,
        hasTarget: false,
      }),
    ).toBeNull();
  });
});

describe("movement aims", () => {
  it("carries logged minutes plus the step and minute aims", () => {
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [],
      exerciseKcal: 250,
      exerciseMinutes: 45,
      profile,
      goal,
    });
    expect(summary.exerciseMinutes).toBe(45);
    expect(summary.exerciseMinutesTarget).toBe(30);
    expect(summary.stepsTarget).toBe(8000);
  });

  it("has no aims without a goal", () => {
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [],
      exerciseKcal: 0,
      profile,
      goal: null,
    });
    expect(summary.exerciseMinutes).toBe(0);
    expect(summary.exerciseMinutesTarget).toBeNull();
    expect(summary.stepsTarget).toBeNull();
  });
});

