import "server-only";
import { prisma } from "@/lib/db";
import { dayKeyForInstant } from "@/lib/domain/dashboard/day-bounds";
import {
  displayWater,
  gToKg,
  gToLb,
  type PreferredUnits,
} from "@/lib/domain/targets/units";
import {
  displayFromMgDl,
  type GlucoseDisplayUnit,
} from "@/lib/domain/glucose/units";
import type { MetricId, TimeRange } from "@/lib/domain/progress/metrics";

function weightChartValue(weightG: number, preferredUnits: PreferredUnits): number {
  return preferredUnits === "imperial" ? gToLb(weightG) : gToKg(weightG);
}

export type SeriesPoint = {
  /** ISO timestamp or day key for sorting. */
  t: string;
  v: number;
  dayKey: string;
  /**
   * Readings behind this point. Weight and glucose plot one point per day, so
   * anything above 1 means earlier readings that day aren't shown.
   */
  samples: number;
};

export type ChartPoint = {
  x: number;
  y: number;
  xLabel: string;
  yLabel: string;
};

/**
 * Points plus the bits the chart needs to explain itself — silently dropping
 * data makes a correct chart look broken.
 */
export type ChartData = {
  points: ChartPoint[];
  /** Days where several readings collapsed into the plotted one. */
  collapsedDays: number;
  /** Scatter only: days with one metric but not the other, so no point exists. */
  unpairedDays: number;
  /**
   * The underlying series per non-time metric, for summary figures. Kept
   * separate from `points` because a scatter drops unpaired days, and summing
   * only the paired days would misreport the range.
   */
  series: { metric: MetricId; points: SeriesPoint[] }[];
};

function rangeStart(now: Date, range: TimeRange): Date {
  // "All time" reaches back before any FitMe account could exist rather than
  // guessing a day count.
  if (range === "all") return new Date(0);
  return new Date(now.getTime() - range * 24 * 60 * 60 * 1000);
}

/** Food fields that map straight onto a daily-sum metric. */
const FOOD_FIELD: Partial<Record<MetricId, string>> = {
  calories: "energyKcal",
  protein: "proteinG",
  carbs: "carbsG",
  fat: "fatG",
  fibre: "fibreG",
};

/**
 * Daily totals for metrics that add up across the day.
 *
 * `samples` counts the entries behind each total. Unlike the `latest` metrics
 * nothing is hidden — the total already includes them — so the chart doesn't
 * warn about it; the count is kept for the summary figures.
 */
async function dailySumSeries(
  userId: string,
  metric: MetricId,
  from: Date,
  to: Date,
  timeZone: string,
  preferredUnits: PreferredUnits,
): Promise<SeriesPoint[]> {
  const byDay = new Map<string, { total: number; samples: number; t: string }>();
  const add = (at: Date, value: number) => {
    if (!Number.isFinite(value)) return;
    const dayKey = dayKeyForInstant(at, timeZone);
    const prev = byDay.get(dayKey);
    byDay.set(dayKey, {
      total: (prev?.total ?? 0) + value,
      samples: (prev?.samples ?? 0) + 1,
      // Keep the day's first instant so the x position is stable.
      t: prev?.t ?? at.toISOString(),
    });
  };

  const foodField = FOOD_FIELD[metric];
  if (foodField) {
    const rows = await prisma.foodEntry.findMany({
      where: { userId, deletedAt: null, loggedAt: { gte: from, lte: to } },
      orderBy: { loggedAt: "asc" },
    });
    for (const row of rows) {
      const value = (row as unknown as Record<string, number | null>)[foodField];
      if (value == null) continue;
      add(row.loggedAt, value);
    }
  } else if (metric === "water") {
    const rows = await prisma.waterEntry.findMany({
      where: { userId, deletedAt: null, loggedAt: { gte: from, lte: to } },
      orderBy: { loggedAt: "asc" },
    });
    for (const row of rows) add(row.loggedAt, row.amountMl);
  } else {
    const rows = await prisma.exerciseEntry.findMany({
      where: { userId, deletedAt: null, performedAt: { gte: from, lte: to } },
      orderBy: { performedAt: "asc" },
    });
    for (const row of rows) {
      add(
        row.performedAt,
        metric === "exercise_minutes" ? row.durationMin : row.estimatedKcal,
      );
    }
  }

  return [...byDay.entries()]
    .map(([dayKey, day]) => ({
      t: day.t,
      // Water is stored in ml but shown in the user's units.
      v: metric === "water" ? displayWater(day.total, preferredUnits) : day.total,
      dayKey,
      samples: day.samples,
    }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

/** Raw metric series in profile timezone day buckets (latest per day for weight/glucose). */
export async function getMetricSeries(
  userId: string,
  metric: MetricId,
  from: Date,
  to: Date,
  timeZone: string,
  preferredUnits: PreferredUnits = "metric",
  glucoseUnit: GlucoseDisplayUnit = "mg_dl",
): Promise<SeriesPoint[]> {
  if (metric === "time") return [];

  if (metric === "weight") {
    const rows = await prisma.weightEntry.findMany({
      where: {
        userId,
        deletedAt: null,
        recordedAt: { gte: from, lte: to },
      },
      orderBy: { recordedAt: "asc" },
    });
    const byDay = new Map<string, SeriesPoint>();
    for (const row of rows) {
      const dayKey = dayKeyForInstant(row.recordedAt, timeZone);
      byDay.set(dayKey, {
        t: row.recordedAt.toISOString(),
        v: weightChartValue(row.weightG, preferredUnits),
        dayKey,
        samples: (byDay.get(dayKey)?.samples ?? 0) + 1,
      });
    }
    return [...byDay.values()].sort((a, b) => a.t.localeCompare(b.t));
  }

  if (metric === "glucose") {
    const rows = await prisma.glucoseEntry.findMany({
      where: {
        userId,
        deletedAt: null,
        measuredAt: { gte: from, lte: to },
      },
      orderBy: { measuredAt: "asc" },
    });
    const byDay = new Map<string, SeriesPoint>();
    for (const row of rows) {
      const dayKey = dayKeyForInstant(row.measuredAt, timeZone);
      byDay.set(dayKey, {
        t: row.measuredAt.toISOString(),
        v: displayFromMgDl(row.valueMgDl, glucoseUnit),
        dayKey,
        samples: (byDay.get(dayKey)?.samples ?? 0) + 1,
      });
    }
    return [...byDay.values()].sort((a, b) => a.t.localeCompare(b.t));
  }

  if (metric !== "fasting_duration") {
    return dailySumSeries(userId, metric, from, to, timeZone, preferredUnits);
  }

  // fasting_duration — ended sessions only, duration in hours
  const rows = await prisma.fastingSession.findMany({
    where: {
      userId,
      deletedAt: null,
      endedAt: { not: null, gte: from, lte: to },
    },
    orderBy: { endedAt: "asc" },
  });
  return rows.map((row) => {
    const endedAt = row.endedAt!;
    const durationMs = endedAt.getTime() - row.startedAt.getTime();
    const dayKey = dayKeyForInstant(endedAt, timeZone);
    return {
      t: endedAt.toISOString(),
      v: Math.max(0, durationMs / (1000 * 60 * 60)),
      dayKey,
      // Every completed fast is plotted, so nothing is hidden here.
      samples: 1,
    };
  });
}

function countCollapsed(series: SeriesPoint[]): number {
  return series.reduce((n, p) => n + (p.samples > 1 ? 1 : 0), 0);
}

/** Build chart data for line (time × metric) or scatter (metric × metric). */
export async function buildChartData(input: {
  userId: string;
  xMetric: MetricId;
  yMetric: MetricId;
  range: TimeRange;
  timeZone: string;
  preferredUnits?: PreferredUnits;
  glucoseUnit?: GlucoseDisplayUnit;
  now?: Date;
}): Promise<ChartData> {
  const now = input.now ?? new Date();
  const from = rangeStart(now, input.range);
  const to = now;
  const preferredUnits = input.preferredUnits ?? "metric";
  const glucoseUnit = input.glucoseUnit ?? "mg_dl";

  if (input.xMetric === "time" && input.yMetric !== "time") {
    const series = await getMetricSeries(
      input.userId,
      input.yMetric,
      from,
      to,
      input.timeZone,
      preferredUnits,
      glucoseUnit,
    );
    return {
      points: series.map((p) => ({
        x: new Date(p.t).getTime(),
        y: p.v,
        xLabel: p.dayKey,
        yLabel: String(Math.round(p.v * 10) / 10),
      })),
      collapsedDays: countCollapsed(series),
      unpairedDays: 0,
      series: [{ metric: input.yMetric, points: series }],
    };
  }

  if (input.yMetric === "time" && input.xMetric !== "time") {
    const series = await getMetricSeries(
      input.userId,
      input.xMetric,
      from,
      to,
      input.timeZone,
      preferredUnits,
      glucoseUnit,
    );
    return {
      points: series.map((p) => ({
        x: p.v,
        y: new Date(p.t).getTime(),
        xLabel: String(Math.round(p.v * 10) / 10),
        yLabel: p.dayKey,
      })),
      collapsedDays: countCollapsed(series),
      unpairedDays: 0,
      series: [{ metric: input.xMetric, points: series }],
    };
  }

  if (input.xMetric !== "time" && input.yMetric !== "time") {
    const [xSeries, ySeries] = await Promise.all([
      getMetricSeries(
        input.userId,
        input.xMetric,
        from,
        to,
        input.timeZone,
        preferredUnits,
        glucoseUnit,
      ),
      getMetricSeries(
        input.userId,
        input.yMetric,
        from,
        to,
        input.timeZone,
        preferredUnits,
        glucoseUnit,
      ),
    ]);
    const yByDay = new Map(ySeries.map((p) => [p.dayKey, p]));
    const points: ChartPoint[] = [];
    const pairedDays = new Set<string>();
    for (const xp of xSeries) {
      const yp = yByDay.get(xp.dayKey);
      if (!yp) continue;
      pairedDays.add(xp.dayKey);
      points.push({
        x: xp.v,
        y: yp.v,
        xLabel: String(Math.round(xp.v * 10) / 10),
        yLabel: String(Math.round(yp.v * 10) / 10),
      });
    }

    // Days with data on only one axis can't be plotted — count them so the UI
    // can say so instead of leaving the user to assume the chart is broken.
    const allDays = new Set([
      ...xSeries.map((p) => p.dayKey),
      ...ySeries.map((p) => p.dayKey),
    ]);
    const paired = [...xSeries, ...ySeries].filter((p) =>
      pairedDays.has(p.dayKey),
    );

    return {
      points,
      collapsedDays: countCollapsed(paired),
      unpairedDays: allDays.size - pairedDays.size,
      series: [
        { metric: input.xMetric, points: xSeries },
        { metric: input.yMetric, points: ySeries },
      ],
    };
  }

  return { points: [], collapsedDays: 0, unpairedDays: 0, series: [] };
}

export { rangeStart };
