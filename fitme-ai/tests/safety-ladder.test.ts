import { describe, it, expect } from "vitest";
import {
  BMI_NEAR_UNDERWEIGHT,
  BMI_UNDERWEIGHT,
  CALORIE_FLOOR_KCAL,
  NO_MEDICAL_ADVICE,
  computeBmi,
  evaluateSafetyLadder,
  isLosingIntent,
} from "@/lib/domain/safety/ladder";

describe("computeBmi", () => {
  it("computes WHO-style BMI", () => {
    // 70 kg, 175 cm → 22.86
    expect(computeBmi(70_000, 175)).toBeCloseTo(22.86, 1);
  });
});

describe("isLosingIntent", () => {
  it("is true from negative weekly change", () => {
    expect(
      isLosingIntent({
        weeklyWeightChangeG: -100,
        currentWeightG: 60_000,
        targetWeightG: 60_000,
      }),
    ).toBe(true);
  });

  it("is true when target is below current even if weekly is zero", () => {
    expect(
      isLosingIntent({
        weeklyWeightChangeG: 0,
        currentWeightG: 60_000,
        targetWeightG: 55_000,
      }),
    ).toBe(true);
  });

  it("is false for weight_loss-shaped data with flat weekly and equal target", () => {
    expect(
      isLosingIntent({
        weeklyWeightChangeG: 0,
        currentWeightG: 60_000,
        targetWeightG: 60_000,
      }),
    ).toBe(false);
  });
});

describe("evaluateSafetyLadder thresholds", () => {
  const base = {
    sex: "female" as const,
    heightCm: 165,
    currentWeightG: 62_000, // BMI ≈ 22.8
    targetWeightG: 62_000,
    caloriesKcal: 2000,
    tdeeKcal: 2200,
    weeklyWeightChangeG: 0,
    goalType: "maintenance",
  };

  it("is green for safe maintenance targets", () => {
    const a = evaluateSafetyLadder(base);
    expect(a.level).toBe("green");
    expect(a.requiresConsent).toBe(false);
    expect(a.reasons).toHaveLength(0);
  });

  it("is red exactly below the female calorie floor", () => {
    const a = evaluateSafetyLadder({
      ...base,
      caloriesKcal: CALORIE_FLOOR_KCAL.female - 1,
    });
    expect(a.level).toBe("red");
    expect(a.requiresConsent).toBe(true);
    expect(a.reasons).toContain("calories_below_floor");
  });

  it("is green at exactly the female calorie floor (boundary)", () => {
    const a = evaluateSafetyLadder({
      ...base,
      caloriesKcal: CALORIE_FLOOR_KCAL.female,
      tdeeKcal: CALORIE_FLOOR_KCAL.female, // avoid aggressive-deficit yellow
    });
    expect(a.reasons).not.toContain("calories_below_floor");
    expect(a.level).not.toBe("red");
  });

  it("is red exactly below the male calorie floor", () => {
    const a = evaluateSafetyLadder({
      ...base,
      sex: "male",
      caloriesKcal: CALORIE_FLOOR_KCAL.male - 1,
    });
    expect(a.level).toBe("red");
    expect(a.reasons).toContain("calories_below_floor");
  });

  it("is yellow for aggressive deficit above the floor", () => {
    const a = evaluateSafetyLadder({
      ...base,
      caloriesKcal: 1600, // > 1200 floor, < 0.8 * 2200
      tdeeKcal: 2200,
    });
    expect(a.level).toBe("yellow");
    expect(a.requiresConsent).toBe(false);
    expect(a.reasons).toContain("calories_aggressive_deficit");
  });

  it("is red for underweight BMI even without loss intent", () => {
    const a = evaluateSafetyLadder({
      ...base,
      currentWeightG: 48_000,
      targetWeightG: 48_000,
      weeklyWeightChangeG: 0,
      goalType: "maintenance",
      caloriesKcal: 1800,
      tdeeKcal: 1800,
    });
    expect(computeBmi(48_000, 165)).toBeLessThan(BMI_UNDERWEIGHT);
    expect(a.level).toBe("red");
    expect(a.reasons).toContain("bmi_underweight");
  });

  it("does not treat goalType weight_loss alone as losing when weekly and target are flat", () => {
    // BMI ≈ 19.0 (near underweight band) at 165 cm → kg ≈ 51.7
    const nearUwG = 51_700;
    expect(computeBmi(nearUwG, 165)).toBeGreaterThanOrEqual(BMI_UNDERWEIGHT);
    expect(computeBmi(nearUwG, 165)).toBeLessThan(BMI_NEAR_UNDERWEIGHT);
    const a = evaluateSafetyLadder({
      ...base,
      currentWeightG: nearUwG,
      targetWeightG: nearUwG,
      weeklyWeightChangeG: 0,
      goalType: "weight_loss",
      caloriesKcal: 1800,
      tdeeKcal: 1800,
    });
    expect(a.reasons).not.toContain("bmi_near_underweight_with_loss");
  });

  it("is yellow for near-underweight BMI while losing", () => {
    const nearUwG = 51_700;
    const a = evaluateSafetyLadder({
      ...base,
      currentWeightG: nearUwG,
      targetWeightG: 50_000,
      weeklyWeightChangeG: -200,
      goalType: "weight_loss",
      caloriesKcal: 1800,
      tdeeKcal: 1800,
    });
    expect(a.level).toBe("yellow");
    expect(a.reasons).toContain("bmi_near_underweight_with_loss");
  });

  it("is red when weekly change exceeds 1% bodyweight", () => {
    // 1% of 62000g = 620g
    const a = evaluateSafetyLadder({
      ...base,
      weeklyWeightChangeG: -621,
      goalType: "weight_loss",
      caloriesKcal: 1800,
      tdeeKcal: 1800,
    });
    expect(a.level).toBe("red");
    expect(a.reasons).toContain("weekly_change_over_1pct");
  });

  it("is not red at exactly 1% weekly change (boundary)", () => {
    const a = evaluateSafetyLadder({
      ...base,
      weeklyWeightChangeG: -620,
      goalType: "weight_loss",
      caloriesKcal: 1800,
      tdeeKcal: 1800,
    });
    expect(a.reasons).not.toContain("weekly_change_over_1pct");
    expect(a.level).toBe("yellow");
    expect(a.reasons).toContain("weekly_change_aggressive");
  });

  it("is yellow when weekly change is between 0.5% and 1%", () => {
    // 0.5% of 62000 = 310; 1% = 620
    const a = evaluateSafetyLadder({
      ...base,
      weeklyWeightChangeG: -400,
      goalType: "weight_loss",
      caloriesKcal: 1800,
      tdeeKcal: 1800,
    });
    expect(a.level).toBe("yellow");
    expect(a.reasons).toContain("weekly_change_aggressive");
  });

  it("exposes no-medical-advice copy for UI checks", () => {
    expect(NO_MEDICAL_ADVICE.toLowerCase()).toContain("not medical advice");
    expect(NO_MEDICAL_ADVICE.toLowerCase()).toContain("supplements");
    expect(NO_MEDICAL_ADVICE.toLowerCase()).not.toContain("buy");
  });
});
