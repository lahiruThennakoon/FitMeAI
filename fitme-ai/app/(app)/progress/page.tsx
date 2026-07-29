import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/dal";
import { buildChartData } from "@/lib/dal/metric-series";
import { getProfileForUser } from "@/lib/dal/profile";
import { AppPageShell } from "@/components/app-page-shell";
import {
  chartCoverageNotes,
  metricAxisLabel,
  parseMetricId,
  parseTimeRange,
  resolveMetricPair,
  timeRangeLabel,
} from "@/lib/domain/progress/metrics";
import { summarizeMetric } from "@/lib/domain/progress/summary";
import { MetricPicker } from "./metric-picker";
import { MetricSummaryPanel } from "./metric-summary";
import { ProgressChart } from "./progress-chart";

type PageProps = {
  searchParams?: Promise<{ x?: string; y?: string; days?: string }>;
};

/**
 * Correlation / trend charts (Epic 9).
 */
export default async function ProgressPage({ searchParams }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");

  const params = searchParams ? await searchParams : {};
  const parsed = resolveMetricPair(
    parseMetricId(params.x),
    parseMetricId(params.y === undefined ? "weight" : params.y),
  );
  const xMetric = parsed.x;
  const yMetric = parsed.y;
  const range = parseTimeRange(params.days);

  const profile = await getProfileForUser(user.id);
  const timeZone = profile?.timezone ?? "UTC";
  const preferredUnits = profile?.preferredUnits ?? "metric";
  const glucoseUnit = profile?.preferredGlucoseUnit ?? "mg_dl";

  const chart = await buildChartData({
    userId: user.id,
    xMetric,
    yMetric,
    range,
    timeZone,
    preferredUnits,
    glucoseUnit,
  });

  const summaries = chart.series
    .map((s) => summarizeMetric(s.metric, s.points))
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const xAxisLabel = metricAxisLabel(xMetric, preferredUnits, glucoseUnit);
  const yAxisLabel = metricAxisLabel(yMetric, preferredUnits, glucoseUnit);
  const coverageNotes = chartCoverageNotes({
    xMetric,
    yMetric,
    pointCount: chart.points.length,
    collapsedDays: chart.collapsedDays,
    unpairedDays: chart.unpairedDays,
  });

  return (
    <AppPageShell
      eyebrow="Progress"
      emoji="📈"
      title="Your patterns"
      description="Explore how your logged metrics relate — curiosity, not judgment."
    >
      <section className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60">
        <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
          <MetricPicker xMetric={xMetric} yMetric={yMetric} range={range} />
        </Suspense>

        <div className="mt-6">
          <ProgressChart
            points={chart.points}
            xMetric={xMetric}
            yMetric={yMetric}
            xAxisLabel={xAxisLabel}
            yAxisLabel={yAxisLabel}
          />
        </div>

        {coverageNotes.length > 0 ? (
          <ul
            className="mt-4 space-y-1 text-xs leading-snug text-neutral-500 dark:text-neutral-400"
            data-testid="chart-coverage-notes"
          >
            {coverageNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}

        {summaries.length > 0 ? (
          <div className="mt-6 border-t border-neutral-200/80 pt-5 dark:border-neutral-700">
            <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
              {timeRangeLabel(range)}
            </p>
            <MetricSummaryPanel
              summaries={summaries}
              preferredUnits={preferredUnits}
              glucoseUnit={glucoseUnit}
            />
          </div>
        ) : null}
      </section>

      <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        Charts show your logged data only. FitMe does not draw medical
        conclusions from correlations — talk to a clinician for health
        decisions.
      </p>
    </AppPageShell>
  );
}
