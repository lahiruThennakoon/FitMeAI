---
baseline_commit: a904663
---

# Story 5.4: Day switcher on Home

Status: review

## Story

As a user,
I want to view yesterday and return to today,
so that one day is a chapter, not the whole book.

## Acceptance Criteria

1. **Given** I am on Home, **when** I use the day control, **then** I can move to the previous local calendar day and back to today (profile timezone, AD-10).
2. **Given** a selected day, **when** Home renders, **then** meals, exercise, water, and energy summary all reflect that day only.
3. **Given** I am viewing today vs yesterday, **when** I look at labels, **then** “Today” vs the past date is clearly distinguished.
4. **Given** v1 scope, **when** I use the control, **then** future days are not offered (only today + yesterday).
5. **Given** yesterday has no data, **when** I view it, **then** empty states are encouraging (no shame copy).
6. **Given** logging CTAs / water quick-add, **when** I am viewing yesterday, **then** logging still targets *today* (or is clearly directed back to today) — never silently log into yesterday.
7. Tests cover: timezone boundary for day keys, invalid/`future` day query falls back to today, yesterday empty filter, return-to-today selection.

## Tasks / Subtasks

- [x] Task 1: Day helpers — `fitme-ai/lib/domain/dashboard/day-bounds.ts`
  - [x] `zonedDayBoundsForDayKey(dayKey, timeZone)`
  - [x] `previousZonedDayKey(dayKey, timeZone)`
  - [x] `resolveHomeDaySelection({ now, timeZone, requestedDay })` → today|yesterday only; invalid/future → today
  - [x] Fix `startOfZonedDay` to use 15-minute steps (half-hour TZ offsets)
- [x] Task 2: UI — `day-switcher.tsx` + wire `dashboard/page.tsx` via `searchParams.day`
- [x] Task 3: Labels / empty states / water logging gate when `!isToday`
- [x] Task 4: Tests + README → review

## Dev Notes

- Prefer URL `?day=YYYY-MM-DD` (server RSC rebuild). Clean `/dashboard` = today.
- Reuse `zonedDayBounds` / `isWithinDay` / `startOfZonedDay`.
- Do not add multi-week history or future days.
- Water/exercise/food create paths keep writing `now()` — do not invent “log into selected day”.
- When viewing yesterday: hide `WaterLogControl`; calm note + link to today.

### References

- [Source: `_bmad-output/planning-artifacts/epic-5-daily-habit-loop.md` — §5.4]
- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 5.4]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5

### Completion Notes List

- URL-driven day selection via `resolveHomeDaySelection` (today + yesterday only).
- Patched `startOfZonedDay` from 1h → 15m steps so Asia/Colombo and other half-hour offsets get true local midnight (unblocked yesterday navigation).
- Water quick-add hidden on yesterday; energy/section labels switch Today ↔ Yesterday; encouraging empty states.

### File List

- fitme-ai/lib/domain/dashboard/day-bounds.ts
- fitme-ai/app/(app)/dashboard/page.tsx
- fitme-ai/app/(app)/dashboard/day-switcher.tsx
- fitme-ai/app/(app)/dashboard/daily-summary-panel.tsx
- fitme-ai/app/(app)/dashboard/today-meals-list.tsx
- fitme-ai/app/(app)/dashboard/today-exercises-list.tsx
- fitme-ai/tests/day-bounds.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/5-4-day-switcher-on-home.md

### Change Log

- 2026-07-27: Implemented Story 5.4 day switcher — status → review

### Review Findings

- [x] [Review][Patch] `startOfZonedDay` hourly probe broke +5:30 TZs — fixed with 15-minute steps + Colombo midnight test.
- [x] [Review][Patch] Energy card hard-coded “Today’s energy” — now switches with `isToday`.
- [x] [Review][Patch] Added malformed `?day=` fallback test.
- [ ] [Review][Defer] Delete confirm still says “from today?” on yesterday rows.
- [ ] [Review][Defer] `supportiveMessage` copy still says “today” for non-empty yesterday summaries.
- [ ] [Review][Defer] Edit/delete remain enabled on yesterday (view/fix history OK for v1).

## Verification

- `npx vitest run tests/day-bounds.test.ts` — 11 passed
- `npx tsc --noEmit` — clean
