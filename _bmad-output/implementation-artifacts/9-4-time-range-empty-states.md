---
baseline_commit: 82b1540
---

# Story 9.4: Time-range + empty/sparse states

Status: review

## Story

As a user,
I want to change the time window and understand sparse data,
so that charts stay usable when I am just starting to log.

## Acceptance Criteria

1. **Given** I am on `/progress`, **when** I choose 7 / 30 / 90 days, **then** the range updates via URL (`?days=`) and series refetch server-side.
2. **Given** fewer than 2 points, **when** the chart renders, **then** a dashed empty state encourages logging (no shame).
3. **Given** invalid metric pair (both `time`), **when** page loads, **then** Y falls back to `weight`.
4. Default range: 30 days.

## Tasks / Subtasks

- [x] Task 1: `TIME_RANGE_OPTIONS` + picker buttons
- [x] Task 2: `parseTimeRangeDays` + empty state in `ProgressChart`
- [x] Task 3: Guard `time × time` on server page → review

## Dev Agent Record

### File List

- fitme-ai/app/(app)/progress/metric-picker.tsx
- fitme-ai/app/(app)/progress/progress-chart.tsx
- fitme-ai/app/(app)/progress/page.tsx
- fitme-ai/lib/domain/progress/metrics.ts

### Change Log

- 2026-07-27: Implemented Story 9.4 time range + empty states — status → review

## Verification

- Manual: new user → empty state; after 2+ weigh-ins → line appears
