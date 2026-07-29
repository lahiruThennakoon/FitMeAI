/** Metric catalog for Progress charts (Epic 9). */

import {
  glucoseUnitLabel,
  type GlucoseDisplayUnit,
} from "@/lib/domain/glucose/units";

export const METRIC_IDS = [
  "time",
  "weight",
  "glucose",
  "fasting_duration",
  "calories",
  "protein",
  "carbs",
  "fat",
  "fibre",
  "water",
  "exercise_kcal",
  "exercise_minutes",
] as const;

export type MetricId = (typeof METRIC_IDS)[number];

/**
 * How a day's readings become one plotted value.
 *
 * `latest` keeps the last reading of the day (a weight is a state, and two
 * weigh-ins don't add up). `sum` totals the day (calories eaten *do* add up).
 * `event` plots every record, since each completed fast is its own datum.
 */
export type MetricAggregation = "none" | "latest" | "sum" | "event";

const AGGREGATION: Record<MetricId, MetricAggregation> = {
  time: "none",
  weight: "latest",
  glucose: "latest",
  fasting_duration: "event",
  calories: "sum",
  protein: "sum",
  carbs: "sum",
  fat: "sum",
  fibre: "sum",
  water: "sum",
  exercise_kcal: "sum",
  exercise_minutes: "sum",
};

export function metricAggregation(id: MetricId): MetricAggregation {
  return AGGREGATION[id];
}

/** `"all"` means every entry ever, not a very large number of days. */
export type TimeRange = 7 | 30 | 90 | 180 | 365 | "all";

export const TIME_RANGE_OPTIONS: TimeRange[] = [7, 30, 90, 180, 365, "all"];

export function timeRangeLabel(range: TimeRange): string {
  if (range === "all") return "All time";
  if (range === 365) return "1 year";
  if (range === 180) return "6 months";
  return `${range} days`;
}

/** Legacy alias kept so existing callers keep compiling. */
export type TimeRangeDays = TimeRange;

export function metricLabel(id: MetricId): string {
  switch (id) {
    case "time":
      return "Time";
    case "weight":
      return "Weight";
    case "glucose":
      return "Glucose";
    case "fasting_duration":
      return "Fasting duration";
    case "calories":
      return "Calories";
    case "protein":
      return "Protein";
    case "carbs":
      return "Carbs";
    case "fat":
      return "Fat";
    case "fibre":
      return "Fibre";
    case "water":
      return "Water";
    case "exercise_kcal":
      return "Exercise burn";
    case "exercise_minutes":
      return "Exercise minutes";
  }
}

/** Grouping for the axis pickers, so twelve options don't read as a wall. */
export const METRIC_GROUPS: { label: string; metrics: MetricId[] }[] = [
  { label: "Time", metrics: ["time"] },
  { label: "Body", metrics: ["weight", "glucose"] },
  {
    label: "Food",
    metrics: ["calories", "protein", "carbs", "fat", "fibre", "water"],
  },
  {
    label: "Activity",
    metrics: ["exercise_kcal", "exercise_minutes", "fasting_duration"],
  },
];

export function metricAxisLabel(
  id: MetricId,
  preferredUnits: "metric" | "imperial" = "metric",
  glucoseUnit: GlucoseDisplayUnit = "mg_dl",
): string {
  switch (id) {
    case "time":
      return "Date";
    case "weight":
      return preferredUnits === "imperial" ? "Weight (lb)" : "Weight (kg)";
    case "glucose":
      return `Glucose (${glucoseUnitLabel(glucoseUnit)})`;
    case "fasting_duration":
      return "Fasting (hours)";
    case "calories":
      return "Calories (kcal/day)";
    case "protein":
      return "Protein (g/day)";
    case "carbs":
      return "Carbs (g/day)";
    case "fat":
      return "Fat (g/day)";
    case "fibre":
      return "Fibre (g/day)";
    case "water":
      return preferredUnits === "imperial"
        ? "Water (fl oz/day)"
        : "Water (ml/day)";
    case "exercise_kcal":
      return "Exercise burn (kcal/day)";
    case "exercise_minutes":
      return "Exercise (min/day)";
  }
}

/** Short unit for summary figures — the axis label is too wordy inline. */
export function metricUnitSuffix(
  id: MetricId,
  preferredUnits: "metric" | "imperial" = "metric",
  glucoseUnit: GlucoseDisplayUnit = "mg_dl",
): string {
  switch (id) {
    case "time":
      return "";
    case "weight":
      return preferredUnits === "imperial" ? "lb" : "kg";
    case "glucose":
      return glucoseUnitLabel(glucoseUnit);
    case "fasting_duration":
      return "h";
    case "calories":
    case "exercise_kcal":
      return "kcal";
    case "protein":
    case "carbs":
    case "fat":
    case "fibre":
      return "g";
    case "water":
      return preferredUnits === "imperial" ? "fl oz" : "ml";
    case "exercise_minutes":
      return "min";
  }
}

export function parseMetricId(raw: string | undefined): MetricId {
  if (raw && METRIC_IDS.includes(raw as MetricId)) return raw as MetricId;
  return "time";
}

export function parseTimeRange(raw: string | undefined): TimeRange {
  if (raw === "all") return "all";
  const n = Number(raw);
  return (TIME_RANGE_OPTIONS as (number | string)[]).includes(n)
    ? (n as TimeRange)
    : 30;
}

/** Legacy alias kept so existing callers keep compiling. */
export const parseTimeRangeDays = parseTimeRange;

export function isScatterPair(x: MetricId, y: MetricId): boolean {
  return x !== "time" && y !== "time" && x !== y;
}

/** Metrics available for one axis when the other axis already uses `selected`. */
export function metricsForAxis(other: MetricId): MetricId[] {
  return METRIC_IDS.filter((id) => id !== other);
}

/** First catalog entry that differs from `exclude`. */
export function defaultAlternateMetric(exclude: MetricId): MetricId {
  return metricsForAxis(exclude)[0] ?? "weight";
}

/** Metrics that keep one point per day, so extra same-day readings are hidden. */
function isDailyMetric(id: MetricId): boolean {
  return metricAggregation(id) === "latest";
}

/**
 * Plain-language notes about what the chart couldn't show.
 *
 * A scatter that joins on calendar day legitimately drops days where only one
 * metric was logged; without saying so, three dots looks like a bug.
 */
export function chartCoverageNotes(input: {
  xMetric: MetricId;
  yMetric: MetricId;
  pointCount: number;
  collapsedDays: number;
  unpairedDays: number;
}): string[] {
  const notes: string[] = [];
  const scatter = isScatterPair(input.xMetric, input.yMetric);

  if (input.collapsedDays > 0) {
    const daily = [input.xMetric, input.yMetric].filter(isDailyMetric);
    const which = daily.map((id) => metricLabel(id).toLowerCase()).join(" and ");
    notes.push(
      `${input.collapsedDays} ${input.collapsedDays === 1 ? "day has" : "days have"} more than one ${which} reading — the chart plots the last one of each day.`,
    );
  }

  if (scatter && input.unpairedDays > 0) {
    notes.push(
      `${input.unpairedDays} ${input.unpairedDays === 1 ? "day" : "days"} had only one of these two metrics logged, so ${input.unpairedDays === 1 ? "it has" : "they have"} no point here. A scatter needs both on the same day.`,
    );
  }

  if (scatter && input.pointCount > 0 && input.pointCount < 5) {
    notes.push(
      "Few points is normal early on — log both metrics on the same day to fill this in.",
    );
  }

  return notes;
}

/**
 * Ensure X and Y differ. When equal, prefer time × metric for trends.
 */
export function resolveMetricPair(
  x: MetricId,
  y: MetricId,
): { x: MetricId; y: MetricId } {
  if (x !== y) return { x, y };
  if (x === "time") return { x: "time", y: "weight" };
  return { x: "time", y: x };
}
