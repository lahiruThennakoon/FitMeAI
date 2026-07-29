---
baseline_commit: dceb060
---

# Story 6.1: Weight check-in log

Status: review

## Story

As a user,
I want to log my weight over time,
so that progress toward my target is visible and my profile weight stays current for burn estimates.

## Acceptance Criteria

1. **Given** I have a profile, **when** I log a weight in preferred units (kg/lb), **then** a `WeightEntry` is saved (canonical grams, AD-11) for now.
2. **Given** I save a check-in, **when** it succeeds, **then** `UserProfile.currentWeightG` updates to that weight (so BMR/exercise estimates stay current).
3. **Given** I open Profile, **when** I have check-ins, **then** I see recent weigh-ins and distance to target weight (calm copy, no shame).
4. **Given** invalid weight (≤0 or absurd), **when** I submit, **then** Zod rejects with field errors.
5. Isolation: only own entries; soft-delete column present for parity (AD-8).
6. Tests: create, profile sync, ownership, schema validation.

## Tasks / Subtasks

- [x] Task 1: Prisma `WeightEntry` + migration + User relation
- [x] Task 2: DAL + schema + `saveWeightEntryAction` (transaction: entry + profile update)
- [x] Task 3: UI on Profile (`/goals`) — log control + recent list + target delta
- [x] Task 4: Tests + README + epic note → review

## Dev Notes

- Canonical storage: grams. Convert at edges via `parseMassToG` / `displayMass`.
- Tone: “progress” / “toward your target” — never “you’re behind.”
- Do not rebuild targets on every weigh-in in this story (profile weight only).

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5

### Completion Notes List

- `WeightEntry` model + migration; create syncs `profile.currentWeightG` in one transaction.
- Profile page Weight check-in card with preferred units, calm delta copy, recent list.
- Tests for DAL, action, schema.

### File List

- fitme-ai/prisma/schema.prisma
- fitme-ai/prisma/migrations/20260727140000_weight_entry/migration.sql
- fitme-ai/lib/dal/weight-entry.ts
- fitme-ai/lib/schemas/weight.ts
- fitme-ai/app/actions/weight.ts
- fitme-ai/app/(app)/goals/weight-check-in.tsx
- fitme-ai/app/(app)/goals/page.tsx
- fitme-ai/tests/weight-entry-dal.test.ts
- fitme-ai/tests/weight-entry-actions.test.ts
- fitme-ai/tests/weight-schema.test.ts
- fitme-ai/README.md
- _bmad-output/planning-artifacts/epic-6-body-progress.md
- _bmad-output/planning-artifacts/epics.md
- _bmad-output/implementation-artifacts/6-1-weight-check-in-log.md

### Change Log

- 2026-07-27: Implemented Story 6.1 weight check-in — status → review

### Review Findings

- [ ] [Review][Defer] Goal/BMR not recomputed on weigh-in — user re-saves Profile to refresh targets (documented).
- [ ] [Review][Defer] No soft-delete UI for weigh-ins yet (column present).
- [x] [Review][Resolved] Trend sparkline → absorbed into Epic 9.5 (`/progress?x=time&y=weight`).

## Verification

- `npx prisma generate` — ok
- weight tests — 9 passed
- `npx tsc --noEmit` — clean
