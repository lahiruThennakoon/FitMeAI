---
baseline_commit: 27ef8d6
---

# Story 5.3: Edit / delete today's exercise

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As a user,
I want to fix or remove a workout I logged today,
so that burn and energy balance stay honest.

## Acceptance Criteria

1. **Given** an exercise I logged today, **when** I open it from Home, **then** I can edit its type / duration / intensity (and `customLabel` when type is `custom`) or soft-delete it.
2. **Given** I save an edit that changes type, duration, or intensity, **when** the action completes, **then** burn is recomputed via `estimateExerciseBurn` and persisted (`estimatedKcal`, `metUsed`, `weightKgUsed`) — estimates remain labelled as estimates (FR-14 / UX invariant).
3. **Given** I choose to remove a workout, **when** I confirm, **then** it is soft-deleted via `deletedAt` — with a calm two-step confirm (no shame copy, no native `confirm()`).
4. **Given** I save an edit or confirm a delete, **when** the action completes, **then** Home refreshes immediately (`router.refresh()`) so Exercise kcal + energy balance update.
5. **Given** I am not the owner of an `ExerciseEntry`, **when** any edit/delete DAL or action call is attempted, **then** it is rejected — isolation via `requireOwnedResource` (AD-7); missing vs cross-user collapsed to one generic "not found" message at the action layer (no enumeration).
6. **Given** invalid input (e.g. `durationMin <= 0`, custom type without label), **when** edit is submitted, **then** Zod rejects with field errors — same rules as create.
7. Tests cover: edit (duration → kcal changes), soft-delete, cross-user denied (DAL + action layers), plus schema validation.

## Tasks / Subtasks

- [x] Task 1: DAL — extend `fitme-ai/lib/dal/exercise-entry.ts` (AC: #1, #2, #3, #5)
  - [x] `ExerciseEntryEditableDto` — lean shape for Home list/edit (id, type, customLabel, durationMin, intensity, estimatedKcal, performedAt, displayName) — same fields as existing `ExerciseEntryDto` is fine; alias or reuse
  - [x] `findOwnedExerciseEntry(userId, id)` — `findFirst({ where: { id, deletedAt: null } })` then `requireOwnedResource` (AD-7), mirroring food 5.2 — **not** `findFirst({ id, userId })` + silent no-op
  - [x] `getEditableExerciseEntry(userId, id)` — fetch single owned/active entry
  - [x] `updateExerciseEntry(userId, id, patch)` — update type/customLabel/durationMin/intensity **and** the three estimate columns passed in by the action (DAL does not call MET itself; action owns recompute)
  - [x] Harden `softDeleteExerciseEntry(userId, id)` — throw via `requireOwnedResource` path (remove silent return); set `deletedAt`
- [x] Task 2: Zod schema — `fitme-ai/lib/schemas/exercise.ts` (AC: #1, #6)
  - [x] `editExerciseEntrySchema`: same core rules as save for `type`, `customLabel`, `durationMin`, `intensity` — omit optional create-only fields (`distanceM`, `sets`, `reps`, `weightG`, `notes`, `performedAt`) to keep the inline form compact (parity with 5.2 scope discipline)
  - [x] Keep `custom` → `customLabel` required via `superRefine`
- [x] Task 3: Server actions — `fitme-ai/app/actions/exercise.ts` (AC: #2, #4, #5, #6)
  - [x] `updateExerciseEntryAction(id, input, deps)` — `requireSession` → zod → profile weight → `estimateExerciseBurn` → `updateExerciseEntry` → `Result` with `estimateLabeled: true`
  - [x] `deleteExerciseEntryAction(id, deps)` — `requireSession` → `softDeleteExerciseEntry` → `Result`
  - [x] Collapse `NotFoundError` + `UnauthorizedError` to one generic message
  - [x] Injectable `deps` for tests; `logger.info`/`logger.error` with `{ event }` shape
  - [x] Do **not** invent `UserCorrection` rows — exercise burn is MET, not AI-origin food
- [x] Task 4: UI — `fitme-ai/app/(app)/dashboard/today-exercises-list.tsx` (NEW) + wire in `page.tsx` (AC: #1–#4)
  - [x] Home currently shows **aggregate** exercise kcal only — there is no per-workout list. Add an "Exercise today" section (mirror Meals today / `TodayMealsList`)
  - [x] Load via `listActiveExerciseEntriesForUser` + filter with `isWithinDay(performedAt, bounds)` (AD-10)
  - [x] Per-row Edit / Delete; edit expands inline form (type, intensity, durationMin, customLabel when custom); delete expands calm Keep / Remove bar
  - [x] Show `~N kcal` / estimate cue on rows; after edit keep estimate labelling
  - [x] `router.refresh()` after successful save/delete
  - [x] Error `<p>` as block sibling **below** the flex row (5.2 CSS layout patch — do not put error as 4th flex child)
  - [x] Empty state: short encouraging line + keep existing "Log exercise" nav CTA (no guilt copy)
- [x] Task 5: Tests (AC: #7)
  - [x] `tests/exercise-entry-edit-dal.test.ts` — update/soft-delete/get, ownership rejection, estimate columns persisted from patch
  - [x] Extend `tests/exercise-schema.test.ts` (or sibling) — valid/invalid edit payloads; zero duration; custom without label
  - [x] `tests/exercise-entry-actions.test.ts` — update/delete actions incl. sign-in required, not-found/cross-user collapsed message, duration change recomputes kcal
- [x] Task 6: README + this story → review

## Dev Notes

### Critical reality check (do not skip)

Home **does not** list workouts today — only `sumExerciseKcalForUserBetween` feeds `DailySummaryPanel`. Story 5.3 **requires** a new today-list UI; editing aggregate-only is impossible. `/exercise` remains create-only (`ExerciseForm`) — do **not** add a history list there (same scope call as 5.2 skipping `/log` history).

`softDeleteExerciseEntry` already exists as a **test helper** with silent no-op on miss. **Replace** that behavior for production mutations — parity with `softDeleteFoodEntry` / `requireOwnedResource`.

### Scope decisions

- Editable fields: **type, customLabel (when custom), durationMin, intensity** → recompute estimate. Optional create fields (distance/sets/reps/weightG/notes/performedAt) stay out of the compact inline form.
- On edit, re-read profile weight (same as create) for `estimateExerciseBurn`; if profile missing, keep 70 kg default + existing disclosure patterns in domain — do not silently change formula policy.
- Persist all three: `estimatedKcal`, `metUsed`, `weightKgUsed`. Never leave stale MET after a type/intensity change.
- No Prisma migration expected — `deletedAt` + estimate columns already exist from Story 3.2.

### Patterns to copy (Story 5.2)

| Concern | Source |
|--------|--------|
| Ownership | `lib/dal/guards.ts` → `requireOwnedResource` via find-by-id-then-check |
| Actions | `app/actions/food-entry.ts` (`updateFoodEntryAction` / `deleteFoodEntryAction`) |
| Client list | `app/(app)/dashboard/today-meals-list.tsx` — modes `"view" \| "editing" \| "confirmingDelete"` |
| Refresh | `useTransition` + server action + `router.refresh()` |
| Delete copy | `Remove "{displayName}" from today?` → Keep / Remove |

### Patterns to preserve (Story 3.2)

- `estimateExerciseBurn` in `lib/domain/burn/exercise-estimate.ts` — formula `kcal ≈ MET × weightKg × hours`
- `EXERCISE_TYPES` / `EXERCISE_INTENSITIES`; custom requires label
- Estimate labelling everywhere: `estimate`, `~N kcal`, `estimateLabeled: true`
- Canonical units: duration min (AD-11)
- List/sum already filter `deletedAt: null` — keep that

### Architecture compliance

- **AD-1:** DAL only (`server-only`); DTOs to UI
- **AD-2:** Mutations in `app/actions/exercise.ts`
- **AD-7:** `requireOwnedResource` for get/update/delete
- **AD-8:** Soft-delete via `deletedAt` only
- **AD-9:** No PII in logs; structured `{ event }`
- **AD-10:** Today = `zonedDayBounds` / `isWithinDay` on `performedAt`
- **AD-11:** Duration minutes; energy kcal
- **AD-13:** `Result` envelope; no throw for expected failures

### UX / tone (UX-DR2)

- Calm, supportive — never "deficit", shame, or "fixing a mistake"
- Edit button label: **Edit**
- Estimates stay labelled after edit
- Soft cards / brand CTAs / shared dashboard shell — match Meals today section

### Project Structure Notes

| Path | NEW / UPDATE |
|------|----------------|
| `fitme-ai/lib/dal/exercise-entry.ts` | UPDATE |
| `fitme-ai/lib/schemas/exercise.ts` | UPDATE |
| `fitme-ai/app/actions/exercise.ts` | UPDATE |
| `fitme-ai/lib/domain/burn/exercise-estimate.ts` | KEEP (reuse only) |
| `fitme-ai/app/(app)/dashboard/today-exercises-list.tsx` | NEW |
| `fitme-ai/app/(app)/dashboard/page.tsx` | UPDATE |
| `fitme-ai/app/(app)/exercise/exercise-form.tsx` | KEEP |
| `fitme-ai/tests/exercise-entry-edit-dal.test.ts` | NEW |
| `fitme-ai/tests/exercise-entry-actions.test.ts` | NEW |
| `fitme-ai/tests/exercise-schema.test.ts` | UPDATE |
| `fitme-ai/README.md` | UPDATE |

### Out of scope

- Day switcher (5.4), water (5.1), meal edit (5.2 done), recent/favorites (5.5)
- Offline exercise edit; hard delete; undo-delete UI
- Editing optional fields (distance/sets/reps/notes) or `performedAt`
- `/exercise` history list; `UserCorrection` for MET edits
- Changing MET table / formula

### Previous story intelligence (5.2)

- Prefer `requireOwnedResource` over exercise/water's older `assertOwnership` + silent miss
- CSS: error message must not sit inside non-wrapping flex row
- `getEditable*` may be unused by UI if list already has fields — still implement + unit-test (API completeness)
- No dedicated jsdom interaction tests for list components (accepted defer)
- Home-only surface is enough

### Git intelligence

Recent commits: water (5.1), meal edit/delete (5.2), Home polish. Continue Epic 5 sequence **5.3 → 5.4 → 5.5**.

### References

- [Source: `_bmad-output/planning-artifacts/epic-5-daily-habit-loop.md` — §5.3]
- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 5 / Story 5.3]
- [Source: `_bmad-output/implementation-artifacts/5-2-edit-delete-todays-meals.md`]
- [Source: `_bmad-output/implementation-artifacts/3-2-manual-exercise-logging.md`]
- [Source: `_bmad-output/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md` — AD-7/8/10/11/13]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5

### Debug Log References

### Completion Notes List

- Extended `lib/dal/exercise-entry.ts` with `getEditableExerciseEntry`, `updateExerciseEntry`, and hardened `softDeleteExerciseEntry` via `findOwnedExerciseEntry` + `requireOwnedResource` (AD-7) — removed the old silent no-op soft-delete.
- `updateExerciseEntryAction` recomputes burn with `estimateExerciseBurn` (profile weight / 70 kg default) and persists `estimatedKcal` / `metUsed` / `weightKgUsed`; returns `estimateLabeled: true`.
- New `today-exercises-list.tsx` on Home mirrors meals: inline edit (type/duration/intensity/custom label), calm Keep/Remove delete, live estimate preview, `router.refresh()`.
- Dashboard loads `listActiveExerciseEntriesForUser` filtered by profile-timezone day bounds (`isWithinDay` on `performedAt`).

### File List

- fitme-ai/lib/dal/exercise-entry.ts
- fitme-ai/lib/schemas/exercise.ts
- fitme-ai/app/actions/exercise.ts
- fitme-ai/app/(app)/dashboard/today-exercises-list.tsx
- fitme-ai/app/(app)/dashboard/page.tsx
- fitme-ai/tests/exercise-entry-edit-dal.test.ts
- fitme-ai/tests/exercise-entry-actions.test.ts
- fitme-ai/tests/exercise-schema.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/5-3-edit-delete-todays-exercise.md

### Change Log

- 2026-07-27: Implemented Story 5.3 edit/delete today's exercise — status → review

### Review Findings

Ran adversarial review (Blind Hunter / Edge Case Hunter / Acceptance Auditor) against ACs + diff.

- [x] [Review][Patch] Fractional `durationMin` (e.g. 0.4) could pass Zod then `Math.round` to 0 — **Fixed**: `editExerciseEntrySchema` requires `.int().positive()`; action no longer rounds.
- [x] [Review][Patch] Non-custom types could persist a crafted `customLabel` — **Fixed**: action always nulls label when `type !== "custom"`.
- [x] [Review][Patch] Cancel left stale error under view mode; validation `fieldErrors` unused in UI — **Fixed**: `cancelEdit` clears errors; duration/customLabel show field errors.
- [x] [Review][Patch] Incomplete action tests (delete NotFoundError collapse; custom-without-label fieldErrors) — **Fixed** with added cases.
- [ ] [Review][Defer] TOCTOU check-then-act on update/delete (same as food 5.2) — no `deletedAt: null` on write predicate.
- [ ] [Review][Defer] No server-side “today” guard on edit/delete — UI filters by day bounds; crafted IDs can edit older owned entries.
- [ ] [Review][Defer] `getEditableExerciseEntry` unused by UI (list already has fields) — kept for API completeness, same as 5.2.
- [ ] [Review][Defer] No jsdom interaction tests for `TodayExercisesList` — same accepted gap as meals/water.
- [ ] [Review][Defer] Stale view-mode props until `router.refresh()` settles after save (same pattern as meals).
- No [Discard] findings that were false positives after triage.

## Verification

- `npx vitest run` (exercise-focused) — 3 files / 29 tests passing after review patches
- `npx tsc --noEmit` — clean
- `npm run lint` — clean

