---
baseline_commit: dd5f269
---

# Story 5.2: Edit / delete today's meals

Status: review

## Story

As a user,
I want to fix or remove a meal logged today,
so that bad numbers don't stick.

## Acceptance Criteria

1. **Given** a meal I logged today, **when** I open it from Home, **then** I can edit its name/quantity/macros or soft-delete it (FR-9 correction path).
2. **Given** I choose to remove a meal, **when** I confirm, **then** it is soft-deleted via `deletedAt` — with a calm confirm step (no shame copy, no jarring native `confirm()`).
3. **Given** I save an edit or confirm a delete, **when** the action completes, **then** Home refreshes immediately (`router.refresh()`), same pattern as water/exercise logging.
4. **Given** I am not the owner of a `FoodEntry`, **when** any edit/delete DAL or action call is attempted, **then** it is rejected — isolation via `requireOwnedResource` (AD-7), same "not found" response for missing vs. cross-user (no enumeration).
5. Tests cover: edit, soft-delete, cross-user denied (DAL + action layers), plus schema validation.

## Tasks / Subtasks

- [x] Task 1: DAL — extend `fitme-ai/lib/dal/food-entry.ts`
  - [x] `getEditableFoodEntry(userId, id)` — fetch single owned/active entry as `FoodEntryEditableDto`
  - [x] `updateFoodEntry(userId, id, patch)` — update name/quantity/macros; log `UserCorrection` rows when the entry has an `aiInteractionId` and a field actually changed (FR-20 audit trail)
  - [x] `softDeleteFoodEntry(userId, id)` — set `deletedAt`
  - [x] All three go through `findOwnedFoodEntry` → `requireOwnedResource` (AD-7); missing/cross-user both surface as `NotFoundError`/`UnauthorizedError` internally, collapsed to one generic message at the action layer
- [x] Task 2: Zod schema — `fitme-ai/lib/schemas/food-entry.ts`
  - [x] `editFoodEntrySchema`: `name` (1–120 chars), `quantity` (positive, ≤1000), six macro fields nullable (never coerce unknown → 0, matching `NutritionMacros` convention)
- [x] Task 3: Server actions — `fitme-ai/app/actions/food-entry.ts`
  - [x] `updateFoodEntryAction(id, input, deps)` and `deleteFoodEntryAction(id, deps)` — mirror `saveExerciseEntryAction`/`saveWaterEntryAction` structure (`requireSession` → zod → DAL → `Result` envelope)
- [x] Task 4: UI — `fitme-ai/app/(app)/dashboard/today-meals-list.tsx` (new client component)
  - [x] Replaces the static "recent meals" `<ul>` in `dashboard/page.tsx`
  - [x] Per-row `Edit` / `Delete` text actions; edit expands an inline form (name, quantity, calories/protein/carbs/fat/fibre/sugar); delete expands a calm two-step confirm bar (`Keep` / `Remove`) instead of a native `confirm()`
  - [x] `router.refresh()` after successful save/delete
- [x] Task 5: Tests
  - [x] `tests/food-entry-edit-dal.test.ts` — update/soft-delete/get, ownership rejection, UserCorrection logging for AI-origin entries, no-correction-logging for manual entries
  - [x] `tests/food-entry-schema.test.ts` — valid/invalid edit payloads
  - [x] `tests/food-entry-actions.test.ts` — update/delete actions incl. sign-in required, not-found/cross-user collapsed message
- [x] Task 6: README + this story → review

## Dev Notes

### Scope decisions

- Editable fields are **name, quantity, and the six macro fields shown elsewhere in the app** (`energyKcal`, `proteinG`, `carbsG`, `fatG`, `fibreG`, `sugarG`) — matches the macros already surfaced as progress bars in `DailySummaryPanel`. `sodiumMg` and `unit`/`mealType` are intentionally **not** editable in this story (kept out of the compact inline form; can be added later without a schema break since they're independent columns).
- The `FoodEntryItem` ingredient breakdown (composite dishes) is **not** editable here — only the top-level `FoodEntry` scalar fields. Editing a composite breakdown is a materially bigger feature (recomputing proportions) and is out of scope.
- Reused the ownership pattern from `lib/dal/guards.ts` (`requireOwnedResource`) rather than the manual `findFirst({ where: { id, userId } })` + `assertOwnership` style used in `exercise-entry.ts`/`water-entry.ts` — this version queries by `id` only, then explicitly checks ownership, so cross-user access and missing/deleted rows are distinguishable *internally* (for precise tests) while the action layer collapses both to one generic "not found" message (no enumeration).
- `UserCorrection` rows are only written when the entry has an `aiInteractionId` (AI-origin) **and** a diffed field actually changed — mirrors the save-time correction diff in `lib/domain/nutrition/corrections.ts`, but implemented as a small local diff (`diffEditableFields`) since the shapes differ (persisted row vs. pre-save draft with `aiSnapshot`).

### Patterns copied directly

- **DAL ownership**: `lib/dal/guards.ts` (`requireOwnedResource`, already unit-tested in `tests/ownership-dal.test.ts`, previously unused elsewhere).
- **Action structure**: `app/actions/water.ts` / `app/actions/exercise.ts` (`requireSession` → zod `safeParse` → DAL call in `try`/`catch` → `Result` envelope, `logger.info`/`logger.error` with `{ event }` shape).
- **Client interaction component**: `app/(app)/dashboard/water-log-control.tsx` (`"use client"` + `useTransition` + server action + `router.refresh()`).

### Tone / UX guardrails

- Calm confirm for delete: an inline "Remove “X” from today? [Keep] [Remove]" bar, not a browser `confirm()` — consistent with UX-DR2 (no shame language either direction).
- Editing a meal is not framed as "fixing a mistake" in the copy — it's just "Edit".

## Dev Agent Record

### Agent Model Used

Cursor Sonnet 5

### Completion Notes List

- Extended `lib/dal/food-entry.ts` with `getEditableFoodEntry`, `updateFoodEntry`, `softDeleteFoodEntry`, all funnelled through a new `findOwnedFoodEntry` helper using `requireOwnedResource` (AD-7) — first real caller of that previously-untested-in-practice guard helper.
- `updateFoodEntry` runs inside a `$transaction`: updates the row, then writes `UserCorrection` rows for any changed field when `aiInteractionId` is present — kept scoped to name/quantity/macros (no `unit`/`mealType` in the diff since they're not editable here).
- New `today-meals-list.tsx` client component replaces the static recent-meals markup in `dashboard/page.tsx`; `page.tsx` maps the existing `listActiveFoodEntriesForUser` rows into the lean `FoodEntryEditableDto` shape rather than changing that DAL function's return shape (it's also consumed by `app/api/offline/catalog/route.ts`, which needs the `food.slug` relation — left untouched).
- Delete uses a two-step inline confirm bar (no native `confirm()`), matching the calm-tone requirement and staying testable without a dialog-mocking workaround.

### File List

- fitme-ai/lib/dal/food-entry.ts
- fitme-ai/lib/schemas/food-entry.ts
- fitme-ai/app/actions/food-entry.ts
- fitme-ai/app/(app)/dashboard/today-meals-list.tsx
- fitme-ai/app/(app)/dashboard/page.tsx
- fitme-ai/tests/food-entry-edit-dal.test.ts
- fitme-ai/tests/food-entry-schema.test.ts
- fitme-ai/tests/food-entry-actions.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/5-2-edit-delete-todays-meals.md

### Change Log

- 2026-07-26: Implemented Story 5.2 edit/delete today's meals — status → review
- 2026-07-26: Adversarial self-review (Blind Hunter / Edge Case Hunter / Acceptance Auditor) caught a CSS layout bug — patched: the error message in the row's default view mode was a 4th flex child in a non-wrapping `flex` row (`<li className="flex items-center justify-between gap-3">`), which would squeeze/overflow instead of dropping to its own line. Fixed by wrapping the row content in its own `<div>` and rendering the error paragraph as a sibling below it.

### Review Findings

Ran an adversarial self-review (Blind Hunter / Edge Case Hunter / Acceptance Auditor lenses) against all ACs and the diff, since no separate reviewer subagent was invoked in this session.

- [x] [Review][Patch] CSS layout bug: delete-failure error message inside the default (view-mode) row could visually break because it was a sibling in a non-wrapping flex row. **Fixed**: row content now lives in its own `flex` `<div>`, with the error `<p>` as a block-level sibling below it in the `<li>`.
- [ ] [Review][Defer] `getEditableFoodEntry` is fully implemented and unit-tested but has no current caller in the UI (the dashboard already has all needed fields inline via the existing `listActiveFoodEntriesForUser` rows, so no extra fetch is needed for the inline-edit pattern chosen). Kept for API completeness / potential future single-entry views (e.g. if a `/log` history view is added per the epic brief's "and/or Log" note) — not dead code in the sense of being unreachable, but currently unused. Flagging as a defer rather than removing, since it's cheap, tested, and matches the DAL's existing completeness convention (`getEditableFoodEntry` mirrors what a future `getEditableExerciseEntry` would look like for 5.3).
- [ ] [Review][Defer] No dedicated jsdom/interaction test for `TodayMealsList`/`MealRow` (click Edit → change field → Save; click Delete → confirm → Remove). Covered indirectly via `food-entry-actions.test.ts` (action layer) + `tsc`/lint, matching the existing test-coverage gap already accepted for sibling client components (`WaterLogControl`, `ExerciseForm`, `InstantLog` also lack direct interaction tests) — not a regression, same defer noted in Story 5.1.
- [ ] [Review][Defer] Editing on the `/log` page itself (epic brief says "Home (and/or Log)") is out of scope — `/log` is a logging form with no history list to attach edit actions to; only Home's "Meals today" list needed it. Noted here in case a future story adds a log-page history view.
- [ ] [Review][Defer] `unit` and `mealType` are not editable in this story (only name/quantity/macros, per the AC and epic brief wording). If a future story needs to let users fix meal type (e.g. logged as "lunch" instead of "dinner"), it can extend `editFoodEntrySchema`/`updateFoodEntry` without a breaking change.
- No [Discard] findings — nothing flagged turned out to be a false positive.

## Verification

- `npx vitest run` — 65 files / 318 tests passing (28 new: `food-entry-edit-dal.test.ts`, `food-entry-schema.test.ts`, `food-entry-actions.test.ts`).
- `npx tsc --noEmit` — clean.
- `npm run lint` — clean.
- `npm run build` — production build succeeds (`/dashboard` still compiles as a dynamic route).
