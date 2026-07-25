import { describe, it, expect } from "vitest";
import {
  ACTIVITY_MULTIPLIERS,
  computeBmr,
  computeTdee,
} from "@/lib/domain/targets/bmr";
import { suggestTargets } from "@/lib/domain/targets/suggest-targets";

describe("Mifflin–St Jeor BMR (known inputs)", () => {
  // 70 kg, 175 cm, age 30
  it("computes male BMR", () => {
    // 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75 → 1649
    expect(
      computeBmr({
        weightKg: 70,
        heightCm: 175,
        ageYears: 30,
        sex: "male",
      }),
    ).toBe(1649);
  });

  it("computes female BMR", () => {
    // 10*70 + 6.25*175 - 5*30 - 161 = 700 + 1093.75 - 150 - 161 = 1482.75 → 1483
    expect(
      computeBmr({
        weightKg: 70,
        heightCm: 175,
        ageYears: 30,
        sex: "female",
      }),
    ).toBe(1483);
  });

  it("applies sedentary TDEE multiplier", () => {
    expect(computeTdee(1649, "sedentary")).toBe(
      Math.round(1649 * ACTIVITY_MULTIPLIERS.sedentary),
    );
  });
});

describe("suggestTargets", () => {
  it("returns full target set for maintenance", () => {
    const t = suggestTargets({
      weightG: 70_000,
      heightCm: 175,
      ageYears: 30,
      sex: "male",
      activityLevel: "moderately_active",
      goalType: "maintenance",
      targetWeightG: 70_000,
    });
    expect(t.bmrKcal).toBe(1649);
    expect(t.tdeeKcal).toBe(Math.round(1649 * 1.55));
    expect(t.caloriesKcal).toBe(t.tdeeKcal);
    expect(t.weeklyWeightChangeG).toBe(0);
    expect(t.proteinG).toBeGreaterThan(0);
    expect(t.carbsG).toBeGreaterThanOrEqual(0);
    expect(t.fatG).toBeGreaterThan(0);
    expect(t.fibreG).toBe(30);
    expect(t.waterMl).toBe(Math.round(70 * 35));
    expect(t.steps).toBe(8000);
    expect(t.exerciseMinutes).toBe(30);
  });

  it("applies a calorie deficit for weight_loss", () => {
    const t = suggestTargets({
      weightG: 80_000,
      heightCm: 170,
      ageYears: 28,
      sex: "female",
      activityLevel: "lightly_active",
      goalType: "weight_loss",
      targetWeightG: 70_000,
    });
    expect(t.caloriesKcal).toBe(t.tdeeKcal - 500);
    expect(t.weeklyWeightChangeG).toBeLessThan(0);
  });
});
