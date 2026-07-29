---
baseline_commit: 82b1540
---

# Story 9.2: Metric series DAL (time-bounded)

Status: review

## Story

As the system,
I want time-bounded metric series from weight, glucose, and fasting data,
so that charts can render consistent DTOs server-side.

## Acceptance Criteria

1. **Given** a user and date range, **when** `getMetricSeries` is called, **then** it returns points for `weight`, `glucose`, or `fasting_duration`.
2. **Given** weight/glucose, **when** multiple entries share a calendar day (profile TZ), **then** latest per day is used (AD-10 day bucket).
3. **Given** fasting, **when** building series, **then** only ended sessions contribute; duration in hours at `endedAt`.
4. **Given** scatter pairs, **when** `buildChartPoints` runs, **then** same-calendar-day join aligns X and Y metrics.
5. Server-only DAL; no health values in logs (AD-9).

## Tasks / Subtasks

- [x] Task 1: Export `dayKeyForInstant` from day-bounds
- [x] Task 2: `lib/dal/metric-series.ts` — `getMetricSeries`, `buildChartPoints`
- [x] Task 3: `lib/domain/progress/metrics.ts` catalog + parsers
- [x] Task 4: Unit tests for metric parsers → review

## Dev Agent Record

### File List

- fitme-ai/lib/dal/metric-series.ts
- fitme-ai/lib/domain/progress/metrics.ts
- fitme-ai/lib/domain/dashboard/day-bounds.ts
- fitme-ai/tests/progress-metrics.test.ts

### Change Log

- 2026-07-27: Implemented Story 9.2 metric series DAL — status → review

### Review Findings

- [x] [Review][Patch] Weight series ignores imperial display [`metric-series.ts:49`, `progress/page.tsx:46-47`] — fixed: `gToLb` when `preferredUnits === "imperial"`.
- [x] [Review][Defer] Scatter same-day join keeps last Y per day [`metric-series.ts:148`] — when Y is `fasting_duration` and multiple fasts end same calendar day, only the last session is plotted. Document v1 behavior or sum durations in a follow-up.

### Review Findings (from 9.1 spike)

- [ ] [Review][Defer] No dedicated integration test with mocked Prisma for `buildChartPoints` — manual + metric parser tests only.

## Verification

- progress-metrics tests — pass
