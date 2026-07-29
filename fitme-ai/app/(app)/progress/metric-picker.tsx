"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  METRIC_GROUPS,
  TIME_RANGE_OPTIONS,
  defaultAlternateMetric,
  metricLabel,
  timeRangeLabel,
  type MetricId,
  type TimeRange,
} from "@/lib/domain/progress/metrics";

type Props = {
  xMetric: MetricId;
  yMetric: MetricId;
  range: TimeRange;
};

const selectClass =
  "mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm dark:border-neutral-600 dark:bg-neutral-950";

/** Grouped options keep twelve metrics scannable. */
function MetricOptions({ disabled }: { disabled: MetricId }) {
  return (
    <>
      {METRIC_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.metrics.map((id) => (
            <option key={id} value={id} disabled={id === disabled}>
              {metricLabel(id)}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

export function MetricPicker({ xMetric, yMetric, range }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(
    patch: Partial<{ x: MetricId; y: MetricId; range: TimeRange }>,
  ) {
    let nextX = patch.x ?? xMetric;
    let nextY = patch.y ?? yMetric;
    const nextRange = patch.range ?? range;

    if (nextX === nextY) {
      if (patch.x !== undefined) {
        nextY = defaultAlternateMetric(nextX);
      } else if (patch.y !== undefined) {
        nextX = defaultAlternateMetric(nextY);
      }
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("x", nextX);
    params.set("y", nextY);
    params.set("days", String(nextRange));
    router.push(`/progress?${params.toString()}`);
  }

  return (
    <div className="space-y-4" data-testid="metric-picker">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="metric-x"
            className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
          >
            X axis
          </label>
          <select
            id="metric-x"
            value={xMetric}
            onChange={(e) => navigate({ x: e.target.value as MetricId })}
            className={selectClass}
          >
            <MetricOptions disabled={yMetric} />
          </select>
        </div>
        <div>
          <label
            htmlFor="metric-y"
            className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
          >
            Y axis
          </label>
          <select
            id="metric-y"
            value={yMetric}
            onChange={(e) => navigate({ y: e.target.value as MetricId })}
            className={selectClass}
          >
            <MetricOptions disabled={xMetric} />
          </select>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
          Time range
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIME_RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => navigate({ range: option })}
              aria-pressed={range === option}
              className={
                range === option
                  ? "choice-pill choice-pill--active"
                  : "choice-pill choice-pill--inactive"
              }
            >
              {timeRangeLabel(option)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
