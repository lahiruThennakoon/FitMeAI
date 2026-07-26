---
baseline_commit: d53c21d
---

# Story 3.1: Auto baseline burn

Status: done

## Story

As a user,
I want my baseline daily burn estimated automatically,
so that net calories work even if I log no exercise.

## Acceptance Criteria

1. Profile exists → dashboard shows Baseline Burn from BMR + activity, with formula + limitations (FR-13)
2. Net Calories computable with zero exercise entries
3. Relevant profile changes recompute Baseline Burn (live from profile on each load)
4. Missing activity level defaults conservatively (sedentary) with a note; units stay canonical (AD-11)

## Tasks / Subtasks

- [x] Task 1: `lib/domain/burn/baseline.ts` — computeBaselineBurn + computeNetCalories
- [x] Task 2: Dashboard panel with formula transparency + empty-profile CTA
- [x] Task 3: Unit + panel tests; README → review

## Dev Notes

- Baseline Burn = TDEE (same multipliers as Story 1.6); not a separate formula.
- Recompute from `getProfileForUser` on dashboard render — not the stored Goal snapshot alone — so profile edits show immediately.
- Exercise burn stays 0 until Story 3.2.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- Domain burn helpers + net with zero exercise
- Dashboard BaselineBurnPanel + profile CTA
- Formula details + medical-advice limitation copy

### File List

- fitme-ai/lib/domain/burn/baseline.ts
- fitme-ai/app/(app)/dashboard/page.tsx
- fitme-ai/app/(app)/dashboard/baseline-burn-panel.tsx
- fitme-ai/tests/baseline-burn.test.ts
- fitme-ai/tests/baseline-burn-panel.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/3-1-auto-baseline-burn.md

### Change Log

- 2026-07-26: Implemented Story 3.1 auto baseline burn — status → review
- 2026-07-26: Review complete — status → done

### Review Findings

- [x] [Review][Defer] Day boundary still uses server local clock — profile timezone (AD-10) deferred with Epic 3.3 dashboard day aggregation
- [x] [Review][Defer] Full net-calorie dashboard polish (macros strip, stronger nudge copy) lands in Story 3.3
