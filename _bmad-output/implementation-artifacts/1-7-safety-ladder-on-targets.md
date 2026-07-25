---
baseline_commit: 0a42281583096a7422ca3b2a04a99ba446a95aca
---

# Story 1.7: Safety ladder on targets

Status: done

## Story

As a user setting an ambitious goal,
I want to be warned when a target is unsafe and give explicit consent for dangerous ones,
so that I am protected from harmful crash targets while keeping control.

## Acceptance Criteria

1. Moderately unsafe → yellow "not recommended"; save allowed without hard block
2. Dangerous → red warning; explicit consent required before save
3. Thresholds: calorie floor ~1200♀ / ~1500♂; underweight BMI; weekly change >~1% bodyweight — cited in-app
4. No supplements/medication advice; point to professional advice
5. Safety decision recorded; consent revocable by returning to safe targets

## Tasks / Subtasks

- [x] Task 1: Domain `evaluateSafetyLadder` + citations + tests
- [x] Task 2: Persist safety level / consent on Goal
- [x] Task 3: saveProfileAction consent gating
- [x] Task 4: Goals UI green/yellow/red + consent
- [x] Task 5: Story → review

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- Pure domain ladder in `lib/domain/safety/ladder.ts` with cited floors / BMI / weekly %
- Red save blocked without `safetyConsent`; yellow is soft warn
- Goal rows store `safetyLevel`, `safetyReasons`, `safetyConsentGiven`, `safetyConsentAt`
- UI shows green/yellow/red panel, citations, no-medical-advice copy

### File List

- fitme-ai/lib/domain/safety/ladder.ts
- fitme-ai/lib/domain/targets/types.ts
- fitme-ai/lib/dal/profile.ts
- fitme-ai/lib/schemas/profile.ts
- fitme-ai/app/actions/profile.ts
- fitme-ai/app/(app)/goals/goals-form.tsx
- fitme-ai/prisma/schema.prisma
- fitme-ai/prisma/migrations/20260725150000_goal_safety_ladder/migration.sql
- fitme-ai/tests/safety-ladder.test.ts
- fitme-ai/tests/save-profile-action.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/1-7-safety-ladder-on-targets.md

### Change Log

- 2026-07-25: Implemented Story 1.7 safety ladder — status → review
- 2026-07-25: Code review Group 1 (1.7) — findings appended below
- 2026-07-26: Applied all review patches (Decision 1 = underweight always red) — status → done

### Review Findings

- [x] [Review][Patch] Red for any underweight BMI (Decision 1) — not only when losing [`fitme-ai/lib/domain/safety/ladder.ts`]
- [x] [Review][Patch] Reset consent when red reasons/targets change while level stays red [`fitme-ai/app/(app)/goals/goals-form.tsx`]
- [x] [Review][Patch] Surface `fieldErrors.safetyConsent` on the checkbox; block submit client-side when red and unchecked [`fitme-ai/app/(app)/goals/goals-form.tsx`]
- [x] [Review][Patch] Treat “losing” from weekly change (and/or target vs current), not `goalType === weight_loss` alone when weekly ≥ 0 [`fitme-ai/lib/domain/safety/ladder.ts`]
- [x] [Review][Patch] Add tests: yellow saves without consent; non-red save clears consent; exact 1% weekly boundary; near-underweight yellow; underweight without loss is red [`fitme-ai/tests/`]
- [x] [Review][Patch] Announce safety level changes with `aria-live` on the safety panel [`fitme-ai/app/(app)/goals/goals-form.tsx`]
- [x] [Review][Defer] Existing goals default to `safetyLevel=green` after migrate without backfill [`fitme-ai/prisma/migrations/20260725150000_goal_safety_ladder/migration.sql`] — deferred, pre-existing data until re-save
- [x] [Review][Defer] Consent not cryptographically bound to assessment payload [`fitme-ai/app/actions/profile.ts:180`] — deferred, authenticated checkbox sufficient for MVP
- [x] [Review][Defer] Adult WHO floors applied for ages 13–17 [`fitme-ai/lib/domain/safety/ladder.ts`] — deferred, product/clinical policy later
- [x] [Review][Defer] Target weight BMI path to underweight not assessed [`fitme-ai/lib/domain/safety/ladder.ts`] — deferred, AC cites current underweight BMI
