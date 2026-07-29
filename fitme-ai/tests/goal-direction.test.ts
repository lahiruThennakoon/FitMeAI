import { describe, it, expect } from "vitest";
import { goalDirectionWarning } from "@/lib/domain/targets/goal-direction";

const KG = 1000;

describe("goalDirectionWarning", () => {
  it("stays quiet when goal and target weight agree", () => {
    expect(
      goalDirectionWarning({
        goalType: "weight_loss",
        currentWeightG: 80 * KG,
        targetWeightG: 72 * KG,
      }),
    ).toBeNull();

    expect(
      goalDirectionWarning({
        goalType: "muscle_gain",
        currentWeightG: 65 * KG,
        targetWeightG: 70 * KG,
      }),
    ).toBeNull();
  });

  it("flags weight loss with a target above current weight", () => {
    const warning = goalDirectionWarning({
      goalType: "weight_loss",
      currentWeightG: 70 * KG,
      targetWeightG: 78 * KG,
    });
    expect(warning).toMatch(/weight loss/i);
    expect(warning).toMatch(/above/i);
  });

  it("flags muscle gain with a target below current weight but allows recomp", () => {
    const warning = goalDirectionWarning({
      goalType: "muscle_gain",
      currentWeightG: 90 * KG,
      targetWeightG: 82 * KG,
    });
    expect(warning).toMatch(/muscle gain/i);
    expect(warning).toMatch(/recomposition/i);
  });

  it("notes that maintenance ignores the target weight", () => {
    expect(
      goalDirectionWarning({
        goalType: "maintenance",
        currentWeightG: 70 * KG,
        targetWeightG: 65 * KG,
      }),
    ).toMatch(/maintenance/i);
  });

  it("treats a sub-500g gap as the same weight", () => {
    expect(
      goalDirectionWarning({
        goalType: "weight_loss",
        currentWeightG: 70_000,
        targetWeightG: 70_300,
      }),
    ).toMatch(/same as your current weight/i);

    expect(
      goalDirectionWarning({
        goalType: "general_health",
        currentWeightG: 70_000,
        targetWeightG: 70_300,
      }),
    ).toBeNull();
  });

  it("says nothing for unusable numbers", () => {
    expect(
      goalDirectionWarning({
        goalType: "weight_loss",
        currentWeightG: Number.NaN,
        targetWeightG: 70 * KG,
      }),
    ).toBeNull();
    expect(
      goalDirectionWarning({
        goalType: "weight_loss",
        currentWeightG: 0,
        targetWeightG: 70 * KG,
      }),
    ).toBeNull();
  });

  it("never scolds", () => {
    const warnings = (
      [
        ["weight_loss", 70, 78],
        ["muscle_gain", 90, 82],
        ["maintenance", 70, 65],
      ] as const
    ).map(([goalType, cw, tw]) =>
      goalDirectionWarning({
        goalType,
        currentWeightG: cw * KG,
        targetWeightG: tw * KG,
      }),
    );

    for (const w of warnings) {
      expect(w).not.toBeNull();
      expect(w!.toLowerCase()).not.toMatch(/wrong|invalid|error|fail|must/);
    }
  });
});
