---
baseline_commit: 5770335
---

# Story 5.5: Recent & favorites on Log

Status: review

## Story

As a user,
I want one-tap re-log of recent meals,
so that everyday foods don't need a full AI parse every time.

## Acceptance Criteria

1. **Given** I have previously saved meals, **when** I open Log, **then** I see recent items and can favorite/unfavorite them.
2. **Given** I tap a recent or favorite item, **when** re-log succeeds, **then** a **new** FoodEntry is created for today (no silent overwrite) with clear UI source (Recent / Favorite) — nutrition `dataSource` copied from the template, not invented as new AI precision.
3. **Given** the item has a catalog `foodSlug` and is in the offline cache, **when** I am offline, **then** re-log queues via the instant path (FR-16).
4. **Given** I have no recent meals, **when** I open Log, **then** an encouraging empty state points to NL parse / Quick log.
5. Favoriting is per-user; isolation via ownership guards.
6. Tests: re-log creates new row; favorite persists; schema/action coverage.

## Tasks / Subtasks

- [x] Task 1: Prisma `isFavorite` on FoodEntry + migration
- [x] Task 2: DAL — recent/favorites list, toggle favorite, relog clone
- [x] Task 3: Actions + Log UI section above InstantLog
- [x] Task 4: Tests + README → review

## Dev Notes

- `isFavorite` boolean on `FoodEntry` (epic lean option).
- Catalog re-log with slug → `saveInstantFoodAction` / offline queue.
- Non-catalog → `relogFromFoodEntry` copies macros + original `dataSource`.
- Do not add recent/favorite to `NutritionDataSource` enum.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5

### Completion Notes List

- Added `isFavorite` + index; DAL templates with foodId/name dedupe; clone re-log + favorite toggle actions.
- Log page loads recent/favorites server-side; client chips for re-log + star; catalog/offline via instant path.
- Empty state points to parse / Quick log.

### File List

- fitme-ai/prisma/schema.prisma
- fitme-ai/prisma/migrations/20260727120000_food_entry_favorite/migration.sql
- fitme-ai/lib/dal/food-template.ts
- fitme-ai/app/actions/food-template.ts
- fitme-ai/app/(app)/log/page.tsx
- fitme-ai/app/(app)/log/recent-favorites.tsx
- fitme-ai/tests/food-template-dal.test.ts
- fitme-ai/tests/food-template-actions.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/5-5-recent-favorites-on-log.md

### Change Log

- 2026-07-27: Implemented Story 5.5 recent & favorites — status → review

### Review Findings

- [x] [Review][Patch] N/A criticals in self-pass — catalog offline queue + clone path covered in UI logic.
- [ ] [Review][Defer] Favorite tied to source FoodEntry row — soft-delete removes pin (acceptable for v1 lean schema).
- [ ] [Review][Defer] No jsdom interaction tests for RecentFavorites chips.
- [ ] [Review][Defer] Ingredient breakdown not copied on non-catalog re-log (top-level macros only).

## Verification

- `npx prisma generate` — ok
- `npx vitest run` food-template tests — 12 passed
- `npx tsc --noEmit` — clean
