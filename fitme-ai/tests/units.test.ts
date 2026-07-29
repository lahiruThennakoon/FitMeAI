import { describe, it, expect } from "vitest";
import {
  cmToIn,
  displayDistance,
  displayHeight,
  displayHeightParts,
  displayMass,
  distanceUnitLabel,
  feetInchesToInches,
  gToKg,
  gToLb,
  inToCm,
  kgToG,
  lbToG,
  parseDistanceToM,
  parseHeightToCm,
  parseMassToG,
  splitFeetInches,
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

describe("height as feet and inches", () => {
  it("splits total inches the way people say their height", () => {
    expect(splitFeetInches(67)).toEqual({ feet: 5, inches: 7 });
    expect(splitFeetInches(72)).toEqual({ feet: 6, inches: 0 });
    expect(splitFeetInches(40)).toEqual({ feet: 3, inches: 4 });
  });

  it("rounds before splitting so no remainder reaches 12 inches", () => {
    // 71.6 in would otherwise render as 5'11.6" — round first, then split.
    expect(splitFeetInches(71.6)).toEqual({ feet: 6, inches: 0 });
    expect(splitFeetInches(71.4)).toEqual({ feet: 5, inches: 11 });
    for (let cm = 100; cm <= 250; cm += 0.5) {
      expect(splitFeetInches(cmToIn(cm)).inches).toBeLessThan(12);
    }
  });

  it("recombines to the same total inches", () => {
    const parts = splitFeetInches(69);
    expect(feetInchesToInches(parts.feet, parts.inches)).toBe(69);
  });

  it("survives a cm → feet/inches → cm round-trip within an inch", () => {
    const parts = splitFeetInches(cmToIn(175));
    const back = inToCm(feetInchesToInches(parts.feet, parts.inches));
    expect(Math.abs(back - 175)).toBeLessThan(2.54);
  });

  it("only splits for imperial users", () => {
    expect(displayHeightParts(175, "imperial")).toEqual({
      feet: 5,
      inches: 9,
    });
    expect(displayHeightParts(175, "metric")).toBeNull();
  });
});

describe("distance in the user's units", () => {
  it("labels km for metric and miles for imperial", () => {
    expect(distanceUnitLabel("metric")).toBe("km");
    expect(distanceUnitLabel("imperial")).toBe("mi");
  });

  it("converts metres to the display unit", () => {
    expect(displayDistance(5_000, "metric")).toBe(5);
    expect(displayDistance(5_000, "imperial")).toBe(3.11);
  });

  it("round-trips a typical run without drifting a metre", () => {
    for (const units of ["metric", "imperial"] as const) {
      const m = parseDistanceToM(5, units);
      expect(Math.abs(displayDistance(m, units) - 5)).toBeLessThan(0.01);
    }
  });

  it("stores whole metres so the DB integer column never truncates", () => {
    expect(Number.isInteger(parseDistanceToM(3.1, "imperial"))).toBe(true);
    expect(Number.isInteger(parseDistanceToM(3.1, "metric"))).toBe(true);
  });

  it("a marathon in miles lands on the right distance", () => {
    expect(parseDistanceToM(26.2, "imperial")).toBe(42_165);
  });
});
