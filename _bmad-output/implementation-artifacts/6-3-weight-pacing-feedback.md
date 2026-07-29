---
baseline_commit: uncommitted
---

# Story 6.3: Weight pacing feedback vs plan

Status: review

## Story

As a user who chose an aggressive weekly weight-change target (e.g. 1 kg/week via override),
I want calm pacing feedback from my weigh-ins,
so that I can see how my actual progress compares to my plan without shame or medical claims.

## Acceptance Criteria

1. **Given** I saved a non-zero `weeklyWeightChangeG` override (e.g. −1000 g = 1 kg/week loss), **when** I open Profile, **then** I see a "Pacing vs plan" section on the weight card showing my plan rate.
2. **Given** fewer than two weigh-ins or span &lt; 7 days, **when** pacing applies, **then** a calm insufficient-data message encourages logging (no empty box).
3. **Given** two+ weigh-ins ≥7 days apart, **when** actual rate differs from plan, **then** copy says on-pace / faster / slower — informational, not judgmental.
4. **Given** safety ladder already warned at save (yellow/red), **when** I weigh in later, **then** pacing feedback complements (does not repeat) those warnings.
5. Override hint on goals form mentions pacing appears after weigh-ins.
6. Unit tests for pacing math and override trigger.

## Tasks / Subtasks

- [x] Task 1: `lib/domain/weight/pacing.ts` — evaluate actual g/week vs plan
- [x] Task 2: Extend `WeightCheckIn` with pacing panel
- [x] Task 3: Wire goal `weeklyWeightChangeG` + `overriddenFields` on `/goals`
- [x] Task 4: Goals form hint on weekly override field
- [x] Task 5: Tests + story doc → review

## Dev Notes

- Trigger: `weeklyWeightChangeOverridden` OR |plan| ≥ 500 g/week (0.5 kg).
- Actual rate: (newest − oldest) weight / weeks between entries.
- On-pace band: ±25% of plan or ±100 g/week, whichever is larger.
- Does not recompute Goal/BMR on weigh-in (unchanged from 6.1 defer).

## File List

- fitme-ai/lib/domain/weight/pacing.ts
- fitme-ai/app/(app)/goals/weight-check-in.tsx
- fitme-ai/app/(app)/goals/page.tsx
- fitme-ai/app/(app)/goals/goals-form.tsx
- fitme-ai/tests/weight-pacing.test.ts
- _bmad-output/implementation-artifacts/6-3-weight-pacing-feedback.md

## Verification

- weight-pacing tests — pass
- `npx tsc --noEmit` — clean
