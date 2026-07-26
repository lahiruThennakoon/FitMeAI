---
baseline_commit: d7d9624
---

# Story 3.2: Manual exercise logging

Status: done

## Story

As a user,
I want to log workouts and see estimated calories burned,
so that my activity counts toward net calories.

## Acceptance Criteria

1. Log Exercise Entry (type, duration, intensity; optional distance/sets/reps/weight/notes) → estimated kcal labeled as estimate (FR-14)
2. Types: walking, running, treadmill, cycling, strength, swimming, sports, custom
3. Custom type persists; zero duration rejected; estimate labeled
4. Today's exercise feeds dashboard net calories (with Baseline Burn)

## Tasks / Subtasks

- [x] Task 1: MET estimate domain + Zod schema
- [x] Task 2: Prisma ExerciseEntry + DAL + save action
- [x] Task 3: `/exercise` a11y form + dashboard wire
- [x] Task 4: Tests + README → review

## Dev Notes

- Estimate: `kcal ≈ MET × bodyKg × hours` (public MET table by type×intensity).
- Body weight from profile; fallback 70 kg with disclosure when missing.
- Soft-delete via `deletedAt` (AD-8). Canonical: duration min, distance m, weight g.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- MET estimate table + labeled live preview on form
- ExerciseEntry migration/DAL/action; custom label required for custom type
- Dashboard sums today's exercise into net calories; Log exercise nav link

### File List

- fitme-ai/lib/domain/burn/exercise-estimate.ts
- fitme-ai/lib/schemas/exercise.ts
- fitme-ai/lib/dal/exercise-entry.ts
- fitme-ai/app/actions/exercise.ts
- fitme-ai/app/(app)/exercise/page.tsx
- fitme-ai/app/(app)/exercise/exercise-form.tsx
- fitme-ai/app/(app)/dashboard/page.tsx
- fitme-ai/app/(app)/dashboard/baseline-burn-panel.tsx
- fitme-ai/prisma/schema.prisma
- fitme-ai/prisma/migrations/20260726120000_exercise_entry/migration.sql
- fitme-ai/tests/exercise-estimate.test.ts
- fitme-ai/tests/exercise-schema.test.ts
- fitme-ai/tests/save-exercise-action.test.ts
- fitme-ai/tests/baseline-burn-panel.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/3-2-manual-exercise-logging.md

### Change Log

- 2026-07-26: Implemented Story 3.2 manual exercise logging — status → done

### Review Findings

- [x] [Review][Defer] Soft-delete UI for exercise entries — DAL helper present; delete UX in later polish
- [x] [Review][Defer] Profile timezone day boundary for exercise sum — same AD-10 deferral as food (Story 3.3)
