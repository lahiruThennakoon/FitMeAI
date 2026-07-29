import { metricLabel } from "@/lib/domain/progress/metrics";
import {
  summaryBasisNote,
  summaryStats,
  type MetricSummary,
} from "@/lib/domain/progress/summary";
import type { GlucoseDisplayUnit } from "@/lib/domain/glucose/units";
import type { PreferredUnits } from "@/lib/domain/targets/units";

type Props = {
  summaries: MetricSummary[];
  preferredUnits: PreferredUnits;
  glucoseUnit: GlucoseDisplayUnit;
};

/** Descriptive figures for the range — no verdicts, no comparison to targets. */
export function MetricSummaryPanel({
  summaries,
  preferredUnits,
  glucoseUnit,
}: Props) {
  if (summaries.length === 0) return null;

  return (
    <div className="space-y-4" data-testid="metric-summary">
      {summaries.map((summary) => {
        const stats = summaryStats(summary, preferredUnits, glucoseUnit);
        const note = summaryBasisNote(summary);
        return (
          <div key={summary.metric}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {metricLabel(summary.metric)} over this range
            </h3>
            <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900"
                >
                  <dt className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {stat.label}
                  </dt>
                  <dd className="text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
            {note ? (
              <p className="mt-2 text-xs leading-snug text-neutral-500 dark:text-neutral-400">
                {note}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
