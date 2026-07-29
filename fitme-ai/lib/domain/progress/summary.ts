/**
 * Aggregates for the Progress page (Tier 3).
 *
 * A chart shows shape; it doesn't answer "what was my average?" or "am I up or
 * down over the range?". These figures are descriptive only — no verdicts, no
 * pass/fail against a target.
 */

import {
  metricAggregation,
  metricLabel,
  metricUnitSuffix,
  type MetricId,
} from "@/lib/domain/progress/metrics";

export type SummaryInputPoint = {
  dayKey: string;
  v: number;
};

export type MetricSummary = {
  metric: MetricId;
  /** Points that went into these figures. */
  count: number;
  /** Distinct days with data — the honest denominator for a daily average. */
  daysWithData: number;
  average: number;
  min: number;
  max: number;
  first: number;
  last: number;
  /** `last - first`; only meaningful for a state metric like weight. */
  change: number;
  /** Total across the range. Null for state metrics, where a total is nonsense. */
  total: number | null;
};

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Decimals worth showing: body metrics need one, counts don't. */
function precisionFor(metric: MetricId): number {
  switch (metric) {
    case "weight":
    case "glucose":
    case "fasting_duration":
      return 1;
    default:
      return 0;
  }
}

/**
 * Points must already be in chronological order — `first`/`last` and therefore
 * `change` depend on it, and re-sorting here would hide a caller's bug.
 */
export function summarizeMetric(
  metric: MetricId,
  points: SummaryInputPoint[],
): MetricSummary | null {
  if (metric === "time" || points.length === 0) return null;

  const values = points.map((p) => p.v);
  const sum = values.reduce((a, b) => a + b, 0);
  const decimals = precisionFor(metric);
  const aggregation = metricAggregation(metric);

  return {
    metric,
    count: points.length,
    daysWithData: new Set(points.map((p) => p.dayKey)).size,
    average: round(sum / values.length, decimals),
    min: round(Math.min(...values), decimals),
    max: round(Math.max(...values), decimals),
    first: round(values[0], decimals),
    last: round(values[values.length - 1], decimals),
    change: round(values[values.length - 1] - values[0], decimals),
    // Totalling weights or glucose readings would produce a meaningless number.
    total: aggregation === "latest" ? null : round(sum, decimals),
  };
}

export type SummaryStat = { label: string; value: string };

/**
 * The stats worth showing for this metric, already formatted.
 *
 * Which ones differ by kind: an average calorie *day* is useful and a total is
 * too; for weight the average matters less than where it started and ended.
 */
export function summaryStats(
  summary: MetricSummary,
  preferredUnits: "metric" | "imperial" = "metric",
  glucoseUnit: "mg_dl" | "mmol_l" = "mg_dl",
): SummaryStat[] {
  const unit = metricUnitSuffix(summary.metric, preferredUnits, glucoseUnit);
  const withUnit = (n: number) => (unit ? `${n} ${unit}` : String(n));
  const signed = (n: number) => `${n > 0 ? "+" : ""}${withUnit(n)}`;
  const aggregation = metricAggregation(summary.metric);

  if (aggregation === "latest") {
    return [
      { label: "Average", value: withUnit(summary.average) },
      { label: "Range", value: `${summary.min}–${withUnit(summary.max)}` },
      { label: "First", value: withUnit(summary.first) },
      { label: "Latest", value: withUnit(summary.last) },
      { label: "Change", value: signed(summary.change) },
    ];
  }

  if (aggregation === "sum") {
    return [
      { label: "Daily average", value: withUnit(summary.average) },
      { label: "Range", value: `${summary.min}–${withUnit(summary.max)}` },
      { label: "Total", value: withUnit(summary.total ?? 0) },
      { label: "Days logged", value: String(summary.daysWithData) },
    ];
  }

  // event: each record stands alone (a completed fast).
  return [
    { label: "Average", value: withUnit(summary.average) },
    { label: "Longest", value: withUnit(summary.max) },
    { label: "Shortest", value: withUnit(summary.min) },
    { label: "Sessions", value: String(summary.count) },
  ];
}

/**
 * Note explaining what a daily average is divided by.
 *
 * Dividing by days-in-range instead of days-logged would quietly punish anyone
 * who skips a day, so we divide by days logged and say so.
 */
export function summaryBasisNote(summary: MetricSummary): string | null {
  if (metricAggregation(summary.metric) !== "sum") return null;
  const noun = summary.daysWithData === 1 ? "day" : "days";
  return `Averages cover the ${summary.daysWithData} ${noun} you logged ${metricLabel(summary.metric).toLowerCase()}, not every day in the range.`;
}
