---
baseline_commit: 82b1540
---

# Story 9.3: XY picker + scatter/line renderer

Status: review

## Story

As a user,
I want to pick X and Y metrics and see a chart,
so that I can explore relationships in my logged data.

## Acceptance Criteria

1. **Given** I am on `/progress`, **when** I select X and Y from the catalog (`time`, `weight`, `glucose`, `fasting_duration`), **then** the URL updates (`?x=&y=`) and the chart re-renders.
2. **Given** X is `time` and Y is a metric, **when** data exists, **then** a line chart shows trend over the range.
3. **Given** both axes are metrics (not `time`), **when** same-day points exist, **then** a scatter plot shows aligned pairs.
4. Axes labeled with units; figcaption states “your logged data”.
5. Default view: `time × weight`.
6. **Given** a time-series chart, **when** I read the axes, **then** Y shows numeric scale ticks (e.g. kg) and X shows readable dates — not bare lines with no values.

## Tasks / Subtasks

- [x] Task 1: `MetricPicker` client component (searchParams navigation)
- [x] Task 2: `ProgressChart` SVG line + scatter modes
- [x] Task 3: Server page fetches `buildChartPoints` → review
- [x] Task 4: Axis scale ticks, grid lines, point tooltips (`chart-scale.ts`)

## Dev Agent Record

### Completion Notes

- 2026-07-29: Added readable Y-axis numeric ticks (nice scale + padding), X-axis date labels for time series, horizontal grid lines, `<title>` tooltips on points, and left/bottom margin for labels.

### File List

- fitme-ai/app/(app)/progress/page.tsx
- fitme-ai/app/(app)/progress/metric-picker.tsx
- fitme-ai/app/(app)/progress/progress-chart.tsx
- fitme-ai/lib/domain/progress/metrics.ts
- fitme-ai/lib/domain/progress/chart-scale.ts
- fitme-ai/tests/progress-chart.test.ts

### Change Log

- 2026-07-27: Implemented Story 9.3 XY picker + chart renderer — status → review
- 2026-07-29: Progress chart axis scales, grid, and date/value tick labels — UX polish follow-up
- 2026-07-29: Non-overlapping date ticks (even spacing + pixel gap filter); metric-aware Y scale for glucose/weight/scatter

### Review Findings

- [x] [Review][Resolved] Chart showed points/lines but no axis tick values — added `niceScale`, date formatting, grid, tooltips.

## Verification

- Manual: switch weight×glucose scatter; time×weight line
- Automated: `tests/progress-chart.test.ts` — ticks and grid in markup
