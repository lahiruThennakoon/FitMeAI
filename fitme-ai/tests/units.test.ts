import { describe, it, expect } from "vitest";
import {
  cmToIn,
  displayHeight,
  displayMass,
  gToKg,
  gToLb,
  inToCm,
  kgToG,
  lbToG,
  parseHeightToCm,
  parseMassToG,
} from "@/lib/domain/targets/units";

describe("unit conversion round-trips (AD-11)", () => {
  it("kg ↔ g", () => {
    expect(kgToG(70)).toBe(70_000);
    expect(gToKg(70_000)).toBe(70);
  });

  it("lb ↔ g ≈ round-trips within 1 g", () => {
    const g = lbToG(154.3);
    expect(Math.abs(gToLb(g) - 154.3)).toBeLessThan(0.05);
  });

  it("cm ↔ in ≈ round-trips", () => {
    const inches = cmToIn(170);
    expect(Math.abs(inToCm(inches) - 170)).toBeLessThan(0.01);
  });

  it("preferred-unit parse/display is consistent for metric", () => {
    const g = parseMassToG(72.5, "metric");
    expect(displayMass(g, "metric")).toBe(72.5);
    const cm = parseHeightToCm(168, "metric");
    expect(displayHeight(cm, "metric")).toBe(168);
  });

  it("preferred-unit parse/display is consistent for imperial", () => {
    const g = parseMassToG(160, "imperial");
    expect(displayMass(g, "imperial")).toBe(160);
    const cm = parseHeightToCm(67, "imperial");
    expect(Math.abs(displayHeight(cm, "imperial") - 67)).toBeLessThan(0.1);
  });
});
