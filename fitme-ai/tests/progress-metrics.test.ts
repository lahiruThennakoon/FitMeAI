import { describe, it, expect } from "vitest";
import {
  METRIC_GROUPS,
  METRIC_IDS,
  chartCoverageNotes,
  defaultAlternateMetric,
  isScatterPair,
  metricAggregation,
  metricAxisLabel,
  metricLabel,
  metricUnitSuffix,
  metricsForAxis,
  parseMetricId,
  parseTimeRange,
  parseTimeRangeDays,
  resolveMetricPair,
  timeRangeLabel,
} from "@/lib/domain/progress/metrics";

describe("progress metrics (Epic 9)", () => {
  it("parses metric ids safely", () => {
    expect(parseMetricId("glucose")).toBe("glucose");
    expect(parseMetricId("nope")).toBe("time");
  });

  it("parses time ranges", () => {
    expect(parseTimeRangeDays("7")).toBe(7);
    expect(parseTimeRangeDays("999")).toBe(30);
  });

  it("detects scatter pairs", () => {
    expect(isScatterPair("weight", "glucose")).toBe(true);
    expect(isScatterPair("time", "weight")).toBe(false);
    expect(isScatterPair("weight", "weight")).toBe(false);
  });

  it("excludes the other axis metric from selectable options", () => {
    expect(metricsForAxis("glucose")).not.toContain("glucose");
    expect(metricsForAxis("glucose")).toContain("weight");
  });

  it("resolves duplicate axis selections", () => {
    expect(resolveMetricPair("time", "time")).toEqual({
      x: "time",
      y: "weight",
    });
    expect(resolveMetricPair("glucose", "glucose")).toEqual({
      x: "time",
      y: "glucose",
    });
    expect(resolveMetricPair("weight", "glucose")).toEqual({
      x: "weight",
      y: "glucose",
    });
  });

  it("picks a default alternate when axes would collide", () => {
    expect(defaultAlternateMetric("time")).toBe("weight");
    expect(defaultAlternateMetric("glucose")).not.toBe("glucose");
  });

  it("labels metrics", () => {
    expect(metricLabel("fasting_duration")).toBe("Fasting duration");
  });

  it("labels the glucose axis in the user's preferred unit", () => {
    expect(metricAxisLabel("glucose", "metric", "mg_dl")).toBe(
      "Glucose (mg/dL)",
    );
    expect(metricAxisLabel("glucose", "metric", "mmol_l")).toBe(
      "Glucose (mmol/L)",
    );
  });

  it("defaults the glucose axis to mg/dL", () => {
    expect(metricAxisLabel("glucose")).toBe("Glucose (mg/dL)");
  });
});

describe("food, water, and exercise metrics", () => {
  it("offers calories, macros, water, and exercise as chartable metrics", () => {
    for (const id of [
      "calories",
      "protein",
      "carbs",
      "fat",
      "fibre",
      "water",
      "exercise_kcal",
      "exercise_minutes",
    ] as const) {
      expect(METRIC_IDS).toContain(id);
      expect(parseMetricId(id)).toBe(id);
    }
  });

  it("adds up metrics that accumulate and keeps the last reading for states", () => {
    // Two lunches add up; two weigh-ins do not.
    expect(metricAggregation("calories")).toBe("sum");
    expect(metricAggregation("water")).toBe("sum");
    expect(metricAggregation("exercise_minutes")).toBe("sum");
    expect(metricAggregation("weight")).toBe("latest");
    expect(metricAggregation("glucose")).toBe("latest");
    expect(metricAggregation("fasting_duration")).toBe("event");
    expect(metricAggregation("time")).toBe("none");
  });

  it("gives every metric an aggregation, so a new one can't slip through", () => {
    for (const id of METRIC_IDS) {
      expect(metricAggregation(id)).toBeDefined();
    }
  });

  it("names the per-day basis on axis labels for summed metrics", () => {
    expect(metricAxisLabel("calories")).toBe("Calories (kcal/day)");
    expect(metricAxisLabel("exercise_minutes")).toBe("Exercise (min/day)");
  });

  it("labels water in the user's units", () => {
    expect(metricAxisLabel("water", "metric")).toBe("Water (ml/day)");
    expect(metricAxisLabel("water", "imperial")).toBe("Water (fl oz/day)");
    expect(metricUnitSuffix("water", "imperial")).toBe("fl oz");
  });

  it("puts every metric in exactly one picker group", () => {
    const grouped = METRIC_GROUPS.flatMap((g) => g.metrics);
    expect([...grouped].sort()).toEqual([...METRIC_IDS].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });
});

describe("time ranges", () => {
  it("accepts the longer windows and all-time", () => {
    expect(parseTimeRange("180")).toBe(180);
    expect(parseTimeRange("365")).toBe(365);
    expect(parseTimeRange("all")).toBe("all");
  });

  it("falls back to 30 days for anything unrecognised", () => {
    expect(parseTimeRange("999")).toBe(30);
    expect(parseTimeRange(undefined)).toBe(30);
    expect(parseTimeRange("-7")).toBe(30);
  });

  it("labels ranges in the units people think in", () => {
    expect(timeRangeLabel(7)).toBe("7 days");
    expect(timeRangeLabel(180)).toBe("6 months");
    expect(timeRangeLabel(365)).toBe("1 year");
    expect(timeRangeLabel("all")).toBe("All time");
  });
});

describe("chartCoverageNotes", () => {
  it("says nothing when everything logged is plotted", () => {
    expect(
      chartCoverageNotes({
        xMetric: "time",
        yMetric: "weight",
        pointCount: 12,
        collapsedDays: 0,
        unpairedDays: 0,
      }),
    ).toEqual([]);
  });

  it("admits that same-day readings collapse to the last one", () => {
    const notes = chartCoverageNotes({
      xMetric: "time",
      yMetric: "glucose",
      pointCount: 10,
      collapsedDays: 3,
      unpairedDays: 0,
    });
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatch(/3 days have more than one glucose reading/i);
    expect(notes[0]).toMatch(/last one of each day/i);
  });

  it("uses singular copy for one collapsed day", () => {
    const notes = chartCoverageNotes({
      xMetric: "time",
      yMetric: "weight",
      pointCount: 5,
      collapsedDays: 1,
      unpairedDays: 0,
    });
    expect(notes[0]).toMatch(/1 day has more than one weight reading/i);
  });

  it("explains a sparse scatter instead of letting it look broken", () => {
    const notes = chartCoverageNotes({
      xMetric: "weight",
      yMetric: "glucose",
      pointCount: 3,
      collapsedDays: 0,
      unpairedDays: 11,
    });
    expect(notes.join(" ")).toMatch(/11 days had only one of these two metrics/i);
    expect(notes.join(" ")).toMatch(/needs both on the same day/i);
    expect(notes.join(" ")).toMatch(/few points is normal/i);
  });

  it("keeps unpaired-day copy out of line charts", () => {
    const notes = chartCoverageNotes({
      xMetric: "time",
      yMetric: "weight",
      pointCount: 2,
      collapsedDays: 0,
      unpairedDays: 9,
    });
    expect(notes).toEqual([]);
  });

  it("drops the sparse hint once a scatter has enough points", () => {
    const notes = chartCoverageNotes({
      xMetric: "weight",
      yMetric: "glucose",
      pointCount: 12,
      collapsedDays: 0,
      unpairedDays: 0,
    });
    expect(notes).toEqual([]);
  });

  it("says nothing about collapsing for summed metrics — the total includes everything", () => {
    const notes = chartCoverageNotes({
      xMetric: "time",
      yMetric: "calories",
      pointCount: 20,
      collapsedDays: 0,
      unpairedDays: 0,
    });
    expect(notes).toEqual([]);
  });
});
