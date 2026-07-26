---
baseline_commit: a004870
---

# Story 3.3: Net-calorie & macro dashboard

Status: done

## Story

As a user,
I want a clear daily summary of calories in vs. out and macros,
so that I can reflect and decide my next move.

## Acceptance Criteria

1. Home shows consumed, target, remaining, macros, water, exercise, Net Calories with progress (FR-15)
2. Updates after food/exercise save (router.refresh)
3. No goal → intake vs burn still meaningful; supportive copy (UX-DR2)
4. Day boundary uses profile timezone (AD-10)

## Tasks / Subtasks

- [x] Task 1: zoned day bounds + daily summary builders
- [x] Task 2: DailySummaryPanel + dashboard wire
- [x] Task 3: Tests + README → done

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- Timezone day bounds; macro aggregation; supportive messages
- Progress bars + water target note; no-goal path

### File List

- fitme-ai/lib/domain/dashboard/day-bounds.ts
- fitme-ai/lib/domain/dashboard/daily-summary.ts
- fitme-ai/app/(app)/dashboard/daily-summary-panel.tsx
- fitme-ai/app/(app)/dashboard/page.tsx
- fitme-ai/tests/day-bounds.test.ts
- fitme-ai/tests/daily-summary.test.ts
- fitme-ai/tests/daily-summary-panel.test.ts
- fitme-ai/README.md

### Change Log

- 2026-07-26: Implemented Story 3.3 — status → done

### Review Findings

- [x] [Review][Defer] Water intake logging UI — target shown only until a water-entry story
