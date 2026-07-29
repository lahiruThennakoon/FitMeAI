import { describe, it, expect } from "vitest";
import {
  summarizeMetric,
  summaryBasisNote,
  summaryStats,
} from "@/lib/domain/progress/summary";

const weightPoints = [
  { dayKey: "2026-07-01", v: 72.4 },
  { dayKey: "2026-07-08", v: 71.9 },
  { dayKey: "2026-07-15", v: 71.2 },
];

const caloriePoints = [
  { dayKey: "2026-07-01", v: 1900 },
  { dayKey: "2026-07-02", v: 2100 },
  { dayKey: "2026-07-04", v: 2000 },
];

describe("summarizeMetric", () => {
  it("summarises a state metric with first, last, and change", () => {
    const summary = summarizeMetric("weight", weightPoints)!;
    expect(summary.count).toBe(3);
    expect(summary.daysWithData).toBe(3);
    expect(summary.first).toBe(72.4);
    expect(summary.last).toBe(71.2);
    expect(summary.change).toBe(-1.2);
    expect(summary.min).toBe(71.2);
    expect(summary.max).toBe(72.4);
  });

  it("refuses to total a state metric, where a sum is meaningless", () => {
    expect(summarizeMetric("weight", weightPoints)!.total).toBeNull();
    expect(summarizeMetric("glucose", weightPoints)!.total).toBeNull();
  });

  it("totals an accumulating metric and averages over days logged", () => {
    const summary = summarizeMetric("calories", caloriePoints)!;
    expect(summary.total).toBe(6000);
    expect(summary.average).toBe(2000);
    expect(summary.daysWithData).toBe(3);
  });

  it("rounds body metrics to one decimal and counts to whole numbers", () => {
    expect(summarizeMetric("weight", [{ dayKey: "d", v: 71.2666 }])!.average).toBe(
      71.3,
    );
    expect(
      summarizeMetric("calories", [{ dayKey: "d", v: 1999.6 }])!.average,
    ).toBe(2000);
  });

  it("returns nothing for an empty range or the time axis", () => {
    expect(summarizeMetric("weight", [])).toBeNull();
    expect(summarizeMetric("time", weightPoints)).toBeNull();
  });

  it("handles a single point without dividing by zero", () => {
    const summary = summarizeMetric("weight", [{ dayKey: "d", v: 70 }])!;
    expect(summary.average).toBe(70);
    expect(summary.change).toBe(0);
    expect(summary.min).toBe(70);
    expect(summary.max).toBe(70);
  });

  it("counts distinct days, not points, for the average denominator", () => {
    // Two workouts on one day is still one logged day.
    const summary = summarizeMetric("exercise_minutes", [
      { dayKey: "2026-07-01", v: 30 },
      { dayKey: "2026-07-01", v: 20 },
    ])!;
    expect(summary.count).toBe(2);
    expect(summary.daysWithData).toBe(1);
  });
});

describe("summaryStats", () => {
  it("shows first, latest, and a signed change for weight", () => {
    const stats = summaryStats(summarizeMetric("weight", weightPoints)!);
    const labels = stats.map((s) => s.label);
    expect(labels).toContain("First");
    expect(labels).toContain("Latest");
    expect(labels).toContain("Change");
    expect(labels).not.toContain("Total");
    const change = stats.find((s) => s.label === "Change")!;
    expect(change.value).toBe("-1.2 kg");
  });

  it("marks a gain with an explicit plus so direction is unambiguous", () => {
    const gaining = summarizeMetric("weight", [
      { dayKey: "a", v: 70 },
      { dayKey: "b", v: 71.5 },
    ])!;
    const change = summaryStats(gaining).find((s) => s.label === "Change")!;
    expect(change.value).toBe("+1.5 kg");
  });

  it("shows weight in pounds for imperial users", () => {
    const stats = summaryStats(
      summarizeMetric("weight", weightPoints)!,
      "imperial",
    );
    expect(stats[0].value).toContain("lb");
  });

  it("shows a daily average, total, and days logged for calories", () => {
    const stats = summaryStats(summarizeMetric("calories", caloriePoints)!);
    const labels = stats.map((s) => s.label);
    expect(labels).toContain("Daily average");
    expect(labels).toContain("Total");
    expect(labels).toContain("Days logged");
    expect(labels).not.toContain("Change");
  });

  it("describes fasts as sessions with a longest and shortest", () => {
    const stats = summaryStats(
      summarizeMetric("fasting_duration", [
        { dayKey: "a", v: 16 },
        { dayKey: "b", v: 18.5 },
      ])!,
    );
    const labels = stats.map((s) => s.label);
    expect(labels).toContain("Longest");
    expect(labels).toContain("Shortest");
    expect(labels).toContain("Sessions");
  });

  it("uses the user's glucose unit in the figures", () => {
    const stats = summaryStats(
      summarizeMetric("glucose", [{ dayKey: "a", v: 6.2 }])!,
      "metric",
      "mmol_l",
    );
    expect(stats[0].value).toContain("mmol/L");
  });

  it("never passes judgment on the numbers", () => {
    const text = summaryStats(summarizeMetric("calories", caloriePoints)!)
      .map((s) => `${s.label} ${s.value}`)
      .join(" ");
    expect(text).not.toMatch(/deficit|over|under|good|bad|should/i);
  });
});

describe("summaryBasisNote", () => {
  it("says the average covers only the days you logged", () => {
    const note = summaryBasisNote(summarizeMetric("calories", caloriePoints)!);
    expect(note).toMatch(/3 days you logged calories/i);
    expect(note).toMatch(/not every day in the range/i);
  });

  it("uses singular copy for one day", () => {
    const note = summaryBasisNote(
      summarizeMetric("water", [{ dayKey: "a", v: 500 }])!,
    );
    expect(note).toMatch(/1 day you logged water/i);
  });

  it("adds no note where an average needs no explanation", () => {
    expect(summaryBasisNote(summarizeMetric("weight", weightPoints)!)).toBeNull();
    expect(
      summaryBasisNote(
        summarizeMetric("fasting_duration", [{ dayKey: "a", v: 16 }])!,
      ),
    ).toBeNull();
  });
});
