"use client";

import type { ChartPoint } from "@/lib/dal/metric-series";
import {
  buildTimeScale,
  filterTicksByPixelGap,
  formatTimeTick,
  formatValueTick,
  niceScaleForMetric,
} from "@/lib/domain/progress/chart-scale";
import type { MetricId } from "@/lib/domain/progress/metrics";
import { isScatterPair } from "@/lib/domain/progress/metrics";

type Props = {
  points: ChartPoint[];
  xMetric: MetricId;
  yMetric: MetricId;
  xAxisLabel: string;
  yAxisLabel: string;
};

const W = 360;
const H = 240;
const PAD_LEFT = 56;
const PAD_RIGHT = 24;
const PAD_TOP = 16;
const PAD_BOTTOM = 48;

const MIN_X_LABEL_GAP = 52;
const MIN_Y_LABEL_GAP = 28;

/**
 * Lightweight SVG chart (Epic 9) — no external chart library.
 */
export function ProgressChart({
  points,
  xMetric,
  yMetric,
  xAxisLabel,
  yAxisLabel,
}: Props) {
  const scatter = isScatterPair(xMetric, yMetric);
  const xIsTime = xMetric === "time";
  const yIsTime = yMetric === "time";

  if (points.length < 2) {
    return (
      <div
        className="flex h-52 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 text-center text-sm text-neutral-600 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-300"
        data-testid="progress-chart-empty"
      >
        <p>
          Not enough logged data yet — keep logging and check back.
          <br />
          <span className="text-xs text-neutral-500">
            Need at least 2 points on both axes.
          </span>
        </p>
      </div>
    );
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  const plotX0 = PAD_LEFT;
  const plotY0 = PAD_TOP;
  const plotW = W - PAD_LEFT - PAD_RIGHT;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const xScale = xIsTime
    ? buildTimeScale(Math.min(...xs), Math.max(...xs), plotW, MIN_X_LABEL_GAP)
    : niceScaleForMetric(Math.min(...xs), Math.max(...xs), xMetric);

  const yScale = yIsTime
    ? buildTimeScale(Math.min(...ys), Math.max(...ys), plotH, MIN_Y_LABEL_GAP)
    : niceScaleForMetric(Math.min(...ys), Math.max(...ys), yMetric);

  const spanX = xScale.max - xScale.min || 1;
  const spanY = yScale.max - yScale.min || 1;

  function sx(x: number) {
    return plotX0 + ((x - xScale.min) / spanX) * plotW;
  }
  function sy(y: number) {
    return plotY0 + plotH - ((y - yScale.min) / spanY) * plotH;
  }

  const xTickValues = filterTicksByPixelGap(xScale.ticks, sx, MIN_X_LABEL_GAP);

  // Value Y ticks from niceScale are already spaced; only filter time-on-Y layouts.
  const yTickValues = yIsTime
    ? filterTicksByPixelGap(yScale.ticks, sy, MIN_Y_LABEL_GAP)
    : yScale.ticks;

  function formatXTick(value: number): string {
    if (xIsTime) return formatTimeTick(value);
    return formatValueTick(value, xMetric);
  }

  function formatYTick(value: number): string {
    if (yIsTime) return formatTimeTick(value);
    return formatValueTick(value, yMetric);
  }

  function xTickLabelLayout(tick: number, index: number) {
    const x = sx(tick);
    const isFirst = index === 0;
    const isLast = index === xTickValues.length - 1;
    if (isFirst && isLast) {
      return { x, textAnchor: "middle" as const };
    }
    if (isFirst) {
      return { x: Math.max(plotX0 + 2, x), textAnchor: "start" as const };
    }
    if (isLast) {
      return { x: Math.min(plotX0 + plotW - 2, x), textAnchor: "end" as const };
    }
    return { x, textAnchor: "middle" as const };
  }

  const linePath = scatter
    ? ""
    : [...points]
        .sort((a, b) => a.x - b.x)
        .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x)} ${sy(p.y)}`)
        .join(" ");

  return (
    <figure data-testid="progress-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-md rounded-xl border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-950"
        role="img"
        aria-label={`Chart of ${yAxisLabel} vs ${xAxisLabel}`}
      >
        {yTickValues.map((tick) => {
          const y = sy(tick);
          return (
            <g key={`y-${tick}`}>
              <line
                x1={plotX0}
                y1={y}
                x2={plotX0 + plotW}
                y2={y}
                className="stroke-neutral-300/80 dark:stroke-neutral-600/70"
                strokeWidth={1}
                strokeDasharray={yIsTime ? "0" : "4 3"}
              />
              <text
                x={plotX0 - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-neutral-700 text-[10px] font-medium tabular-nums dark:fill-neutral-200"
              >
                {formatYTick(tick)}
              </text>
            </g>
          );
        })}

        {xTickValues.map((tick, index) => {
          const xPos = xTickLabelLayout(tick, index);
          return (
            <g key={`x-${tick}`}>
              {!xIsTime ? (
                <line
                  x1={xPos.x}
                  y1={plotY0}
                  x2={xPos.x}
                  y2={plotY0 + plotH}
                  className="stroke-neutral-100 dark:stroke-neutral-800"
                  strokeWidth={1}
                />
              ) : null}
              <text
                x={xPos.x}
                y={plotY0 + plotH + 16}
                textAnchor={xPos.textAnchor}
                className="fill-neutral-700 text-[10px] font-medium tabular-nums dark:fill-neutral-200"
              >
                {formatXTick(tick)}
              </text>
            </g>
          );
        })}

        <line
          x1={plotX0}
          y1={plotY0 + plotH}
          x2={plotX0 + plotW}
          y2={plotY0 + plotH}
          className="stroke-neutral-400 dark:stroke-neutral-500"
          strokeWidth={1.25}
        />
        <line
          x1={plotX0}
          y1={plotY0}
          x2={plotX0}
          y2={plotY0 + plotH}
          className="stroke-neutral-400 dark:stroke-neutral-500"
          strokeWidth={1.25}
        />

        {!scatter && linePath ? (
          <path
            d={linePath}
            fill="none"
            className="stroke-brand-blue"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {points.map((p, i) => (
          <g key={`${p.x}-${p.y}-${i}`}>
            <circle
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={scatter ? 4.5 : 3.5}
              className="fill-brand-teal stroke-white stroke-[1.5] dark:stroke-neutral-950"
            />
            <title>{`${xAxisLabel}: ${p.xLabel}, ${yAxisLabel}: ${p.yLabel}`}</title>
          </g>
        ))}

        <text
          x={plotX0 + plotW / 2}
          y={H - 6}
          textAnchor="middle"
          className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
        >
          {xAxisLabel}
        </text>
        <text
          x={16}
          y={plotY0 + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${plotY0 + plotH / 2})`}
          className="fill-neutral-500 text-[10px] dark:fill-neutral-400"
        >
          {yAxisLabel}
        </text>
      </svg>
      <figcaption className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
        Your logged data — patterns here are not medical conclusions. Hover a
        point for exact values.
      </figcaption>
    </figure>
  );
}
