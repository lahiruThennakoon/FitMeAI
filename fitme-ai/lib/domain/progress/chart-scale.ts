/** Compute “nice” axis ticks for lightweight SVG charts (Epic 9). */

import type { MetricId } from "@/lib/domain/progress/metrics";

export type NiceScale = {
  min: number;
  max: number;
  ticks: number[];
};

export type NiceScaleOptions = {
  targetTicks?: number;
  paddingRatio?: number;
};

const DEFAULT_OPTIONS: Required<NiceScaleOptions> = {
  targetTicks: 5,
  paddingRatio: 0.05,
};

/**
 * Pad domain slightly and return evenly spaced, human-readable tick values.
 */
export function niceScale(
  dataMin: number,
  dataMax: number,
  targetTicksOrOptions: number | NiceScaleOptions = DEFAULT_OPTIONS.targetTicks,
  legacyPadding?: number,
): NiceScale {
  const options: Required<NiceScaleOptions> =
    typeof targetTicksOrOptions === "number"
      ? {
          targetTicks: targetTicksOrOptions,
          paddingRatio: legacyPadding ?? DEFAULT_OPTIONS.paddingRatio,
        }
      : { ...DEFAULT_OPTIONS, ...targetTicksOrOptions };

  let min = dataMin;
  let max = dataMax;

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1, ticks: [0, 0.5, 1] };
  }

  if (min === max) {
    const bump = min === 0 ? 1 : Math.max(Math.abs(min) * 0.08, 0.5);
    min -= bump;
    max += bump;
  }

  const span = max - min;
  const pad = span * options.paddingRatio;
  min -= pad;
  max += pad;

  const rawStep = (max - min) / Math.max(1, options.targetTicks - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const normalized = rawStep / magnitude;

  let niceNormalized: number;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 2.5) niceNormalized = 2.5;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;

  let step = niceNormalized * magnitude;
  // Never use a step so large that fewer than 3 ticks span the padded domain.
  const maxStep = (max - min) / 2;
  if (step > maxStep) step = maxStep;

  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step * 0.001; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }

  return { min: niceMin, max: niceMax, ticks };
}

/** Metric-aware value scale — tighter steps for glucose, weight, fasting. */
export function niceScaleForMetric(
  dataMin: number,
  dataMax: number,
  metric: MetricId,
): NiceScale {
  switch (metric) {
    case "glucose":
      return niceScale(dataMin, dataMax, { targetTicks: 6, paddingRatio: 0.04 });
    case "weight":
      return niceScale(dataMin, dataMax, { targetTicks: 5, paddingRatio: 0.06 });
    case "fasting_duration":
      return niceScale(dataMin, dataMax, { targetTicks: 5, paddingRatio: 0.08 });
    default:
      return niceScale(dataMin, dataMax);
  }
}

export type TimeScale = NiceScale;

/** Evenly spaced time ticks between first and last point — not one label per datum. */
export function buildTimeScale(
  minMs: number,
  maxMs: number,
  plotWidthPx: number,
  minLabelGapPx = 52,
): TimeScale {
  if (!Number.isFinite(minMs) || !Number.isFinite(maxMs)) {
    return { min: 0, max: 1, ticks: [0, 1] };
  }
  if (minMs === maxMs) {
    const day = 24 * 60 * 60 * 1000;
    return { min: minMs - day, max: maxMs + day, ticks: [minMs - day, minMs, maxMs + day] };
  }

  const maxLabels = Math.max(2, Math.floor(plotWidthPx / minLabelGapPx));
  const labelCount = Math.min(maxLabels, 4);

  const ticks: number[] = [];
  for (let i = 0; i < labelCount; i++) {
    ticks.push(minMs + (i / (labelCount - 1)) * (maxMs - minMs));
  }

  return { min: minMs, max: maxMs, ticks };
}

/**
 * Drop tick labels that would collide on screen (applies to any axis).
 * Uses absolute pixel distance so vertical axes (decreasing pixel Y) work correctly.
 */
export function filterTicksByPixelGap(
  ticks: number[],
  toPixel: (value: number) => number,
  minGapPx: number,
): number[] {
  if (ticks.length <= 1) return ticks;

  const sorted = [...ticks].sort((a, b) => a - b);
  const kept: number[] = [];
  let lastPx = -Infinity;

  for (const tick of sorted) {
    const px = toPixel(tick);
    if (kept.length === 0 || Math.abs(px - lastPx) >= minGapPx) {
      kept.push(tick);
      lastPx = px;
    }
  }

  const last = sorted[sorted.length - 1]!;
  const lastKept = kept[kept.length - 1]!;
  if (last !== lastKept && Math.abs(toPixel(last) - toPixel(lastKept)) >= minGapPx) {
    kept.push(last);
  }

  return kept;
}

/** Short date for axis, e.g. "Jul 20". */
export function formatTimeTick(epochMs: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(epochMs));
  } catch {
    return new Date(epochMs).toISOString().slice(0, 10);
  }
}

/** Format a numeric tick for display (compact, tabular-friendly). */
export function formatValueTick(value: number, metric?: MetricId): string {
  if (metric === "glucose") return String(Math.round(value));
  const abs = Math.abs(value);
  if (abs >= 100) return String(Math.round(value));
  if (abs >= 10) return String(Math.round(value * 10) / 10);
  return String(Math.round(value * 100) / 100);
}

/**
 * @deprecated Use buildTimeScale — kept for tests migrating off point-index labels.
 */
export function pickLabelIndices(length: number, maxLabels = 5): number[] {
  if (length <= 0) return [];
  if (length <= maxLabels) {
    return Array.from({ length }, (_, i) => i);
  }
  const indices: number[] = [];
  for (let i = 0; i < maxLabels; i++) {
    indices.push(Math.round((i / (maxLabels - 1)) * (length - 1)));
  }
  return [...new Set(indices)];
}
