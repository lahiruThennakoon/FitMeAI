import { describe, it, expect } from "vitest";
import {
  BASELINE_BURN_LIMITATION,
  DEFAULT_ACTIVITY_LEVEL,
  computeBaselineBurn,
  computeNetCalories,
  resolveActivityLevel,
} from "@/lib/domain/burn/baseline";
import { ACTIVITY_MULTIPLIERS } from "@/lib/domain/targets/bmr";

describe("computeBaselineBurn (FR-13)", () => {
  it("computes BMR × activity for known inputs", () => {
    // 70 kg, 175 cm, 30, male → BMR 1649; moderately_active → ×1.55
    const result = computeBaselineBurn({
      weightG: 70_000,
      heightCm: 175,
      ageYears: 30,
      sex: "male",
      activityLevel: "moderately_active",
    });
    expect(result.bmrKcal).toBe(1649);
    expect(result.baselineBurnKcal).toBe(Math.round(1649 * 1.55));
    expect(result.activityMultiplier).toBe(
      ACTIVITY_MULTIPLIERS.moderately_active,
    );
    expect(result.usedDefaultActivity).toBe(false);
    expect(result.formulaBmr).toMatch(/BMR/);
    expect(result.formulaTdee).toMatch(/activity multiplier/);
    expect(result.limitation).toBe(BASELINE_BURN_LIMITATION);
  });

  it("recomputes when activity level changes", () => {
    const base = {
      weightG: 70_000,
      heightCm: 175,
      ageYears: 30,
      sex: "male" as const,
    };
    const sedentary = computeBaselineBurn({
      ...base,
      activityLevel: "sedentary",
    });
    const very = computeBaselineBurn({
      ...base,
      activityLevel: "very_active",
    });
    expect(very.baselineBurnKcal).toBeGreaterThan(sedentary.baselineBurnKcal);
    expect(sedentary.bmrKcal).toBe(very.bmrKcal);
  });

  it("defaults missing activity to sedentary with a note", () => {
    expect(resolveActivityLevel(null)).toEqual({
      activityLevel: DEFAULT_ACTIVITY_LEVEL,
      usedDefault: true,
    });
    const result = computeBaselineBurn({
      weightG: 70_000,
      heightCm: 175,
      ageYears: 30,
      sex: "female",
      activityLevel: null,
    });
    expect(result.usedDefaultActivity).toBe(true);
    expect(result.activityLevel).toBe("sedentary");
    expect(result.baselineBurnKcal).toBe(
      Math.round(result.bmrKcal * ACTIVITY_MULTIPLIERS.sedentary),
    );
  });
});

describe("computeNetCalories (FR-13)", () => {
  it("works with zero exercise entries", () => {
    expect(
      computeNetCalories({
        intakeKcal: 1800,
        baselineBurnKcal: 2200,
        exerciseKcal: 0,
      }),
    ).toBe(-400);
  });

  it("subtracts exercise when provided", () => {
    expect(
      computeNetCalories({
        intakeKcal: 1800,
        baselineBurnKcal: 2200,
        exerciseKcal: 300,
      }),
    ).toBe(-700);
  });
});
