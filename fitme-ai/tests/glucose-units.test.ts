import { describe, it, expect } from "vitest";
import {
  GLUCOSE_FUTURE_SKEW_MS,
  displayFromMgDl,
  glucoseUnitLabel,
  isFutureMeasurement,
  isGlucoseInRange,
  mgDlFromDisplay,
} from "@/lib/domain/glucose/units";

describe("glucose units (Epic 8)", () => {
  it("converts mmol/L to mg/dL on save", () => {
    expect(mgDlFromDisplay(5.5, "mmol_l")).toBeCloseTo(99.1, 0);
  });

  it("passes through mg/dL", () => {
    expect(mgDlFromDisplay(100, "mg_dl")).toBe(100);
  });

  it("displays mmol/L from canonical mg/dL", () => {
    expect(displayFromMgDl(90, "mmol_l")).toBeCloseTo(4.99, 1);
  });

  it("labels units", () => {
    expect(glucoseUnitLabel("mg_dl")).toBe("mg/dL");
    expect(glucoseUnitLabel("mmol_l")).toBe("mmol/L");
  });
});

describe("glucose plausibility bounds", () => {
  it("accepts everyday readings in both units", () => {
    expect(isGlucoseInRange(95, "mg_dl")).toBe(true);
    expect(isGlucoseInRange(5.3, "mmol_l")).toBe(true);
  });

  it("rejects typos far outside human range", () => {
    expect(isGlucoseInRange(99999, "mg_dl")).toBe(false);
    expect(isGlucoseInRange(5, "mg_dl")).toBe(false);
  });

  it("applies bounds after converting mmol/L", () => {
    // 45 mmol/L is ~811 mg/dL — just over the ceiling.
    expect(isGlucoseInRange(45, "mmol_l")).toBe(false);
    expect(isGlucoseInRange(0.5, "mmol_l")).toBe(false);
  });
});

describe("future measurement guard", () => {
  const now = Date.parse("2026-07-29T08:00:00.000Z");

  it("allows past and present readings", () => {
    expect(isFutureMeasurement(now - 60_000, now)).toBe(false);
    expect(isFutureMeasurement(now, now)).toBe(false);
  });

  it("tolerates small client clock skew", () => {
    expect(isFutureMeasurement(now + GLUCOSE_FUTURE_SKEW_MS - 1, now)).toBe(
      false,
    );
  });

  it("rejects clearly future readings", () => {
    expect(isFutureMeasurement(now + 24 * 60 * 60 * 1000, now)).toBe(true);
  });
});
