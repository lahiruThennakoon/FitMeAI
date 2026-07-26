---
baseline_commit: 347409f
---

# Story 2.6: Review & edit before save (+ correction capture)

Status: review

## Story

As a user,
I want to check and fix values before saving,
so that I trust what gets recorded and the app learns from my fixes.

## Acceptance Criteria

1. Given an AI-produced set of entries, I can edit food identity, quantity, unit, and macros before saving (FR-9)
2. No AI-produced entry persists without passing the confirm/edit step (`confirmed: true`)
3. Each edit of an AI value is captured as a User Correction (before/after, timestamp) (FR-20, AD-8)
4. Discarding leaves nothing persisted

## Tasks / Subtasks

- [x] Task 1: FoodEntry / FoodEntryItem / AIInteraction stub / UserCorrection schema + migration
- [x] Task 2: AI snapshot on parse; `diffAiCorrections`; save DAL + `saveMealDraftAction`
- [x] Task 3: Review UI — macro editors, Save log, Discard
- [x] Task 4: Tests + README → review

## Dev Notes

- Soft-delete via `deletedAt` on FoodEntry (AD-8).
- Minimal `AIInteraction` stub for provenance; full audit is Story 2.10.
- Manual-origin drafts do not write UserCorrection rows.
- Migration `20260726090000_food_entry_corrections` — run `npx prisma migrate deploy` when Postgres is up.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- Persist only via `saveMealDraftAction` with `confirmed: true`
- AI drafts keep immutable `aiSnapshot`; diffs → `UserCorrection` on save
- Discard is client-only (no DB write)
- 188 tests green

### File List

- fitme-ai/prisma/schema.prisma
- fitme-ai/prisma/migrations/20260726090000_food_entry_corrections/migration.sql
- fitme-ai/lib/dal/food-entry.ts
- fitme-ai/lib/domain/nutrition/corrections.ts
- fitme-ai/lib/domain/nutrition/parse-types.ts
- fitme-ai/lib/domain/nutrition/resolve-parse.ts
- fitme-ai/lib/schemas/log.ts
- fitme-ai/app/actions/log.ts
- fitme-ai/app/(app)/log/log-meal-form.tsx
- fitme-ai/tests/corrections.test.ts
- fitme-ai/tests/save-meal-action.test.ts
- fitme-ai/tests/save-meal-schema.test.ts
- fitme-ai/tests/food-entry-dal.test.ts
- fitme-ai/tests/draft-recompute.test.ts
- fitme-ai/tests/clarifying-chips.test.ts
- fitme-ai/tests/decompose.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/2-6-review-edit-before-save.md
- _bmad-output/implementation-artifacts/deferred-work.md

### Change Log

- 2026-07-26: Implemented Story 2.6 review/save + correction capture — status → review
- 2026-07-26: Review patches — snapshot required; identity clears FK; macro ≥ 0; unique ids; provider from env

### Review Findings

- [x] [Review][Patch] Require `aiSnapshot` for `ai_parse` saves [`log.ts` schema]
- [x] [Review][Patch] Clear catalog FK on identity (name) edit [form + action]
- [x] [Review][Patch] Reject negative macros + duplicate draft ids [schema]
- [x] [Review][Patch] `providerId`/`model` from `readAiRuntimeConfig` [action]
- [ ] [Review][Defer] Server-held AI snapshots (client can still spoof origin/snapshot)
- [ ] [Review][Defer] Idempotent save / duplicate-submit protection
- [ ] [Review][Defer] Capture breakdown proportion edits as UserCorrection fields
