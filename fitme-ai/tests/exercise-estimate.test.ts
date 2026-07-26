import { describe, it, expect } from "vitest";
import {
  DEFAULT_EXERCISE_WEIGHT_KG,
  EXERCISE_ESTIMATE_LIMITATION,
  estimateExerciseBurn,
  metFor,
} from "@/lib/domain/burn/exercise-estimate";

describe("estimateExerciseBurn (FR-14)", () => {
  it("estimates known walking session", () => {
    // MET 3.5 × 70 kg × 0.5 h = 122.5 → 123
    const result = estimateExerciseBurn({
      type: "walking",
      intensity: "moderate",
      durationMin: 30,
      weightKg: 70,
    });
    expect(result.met).toBe(metFor("walking", "moderate"));
    expect(result.estimatedKcal).toBe(Math.round(3.5 * 70 * 0.5));
    expect(result.limitation).toBe(EXERCISE_ESTIMATE_LIMITATION);
    expect(result.usedDefaultWeight).toBe(false);
  });

  it("uses default weight when profile weight missing", () => {
    const result = estimateExerciseBurn({
      type: "running",
      intensity: "high",
      durationMin: 20,
      weightKg: null,
    });
    expect(result.usedDefaultWeight).toBe(true);
    expect(result.weightKgUsed).toBe(DEFAULT_EXERCISE_WEIGHT_KG);
  });

  it("supports custom type", () => {
    const result = estimateExerciseBurn({
      type: "custom",
      intensity: "moderate",
      durationMin: 40,
      weightKg: 80,
    });
    expect(result.met).toBe(5);
    expect(result.estimatedKcal).toBe(Math.round(5 * 80 * (40 / 60)));
  });
});
