---
baseline_commit: f1b0af2ee95232bf245757127c19b46b23ad1ecb
---

# Story 2.4: Composite-dish decomposition & bottom-up calculation

Status: review

## Story

As a user,
I want composite dishes broken into ingredients and totaled from them,
so that "rice and curry" gets accurate nutrition.

## Acceptance Criteria

1. Composite catalog foods decompose into ingredients with proportions; dish nutrition equals the sum of ingredient contributions within rounding (FR-7)
2. Ingredient breakdown is viewable in the log review UI
3. Editing a proportion normalizes to 100% and recomputes nutrition
4. Unknown ingredient macros stay null / estimated (never fabricated as 0); full estimate UX is Story 2.8

## Tasks / Subtasks

- [x] Task 1: Domain decompose + normalize proportions + recompute
- [x] Task 2: Attach breakdown on parse resolve; rescale with qty/unit
- [x] Task 3: Breakdown UI with proportion edits
- [x] Task 4: Unit tests + README → review

## Dev Notes

- Prefer catalog `composite` foods (pol sambol, dhal curry, milk tea, …). Multi-item AI parses already split separate foods in 2.3.
- Persist FoodEntryItem rows is Story 2.6 — draft breakdown only for now.
- Totals must come from `sumNutrition(contributions)`, not a parallel precomputed path that can drift.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- `decomposeFoodPortion` builds ingredient lines + bottom-up totals for composites
- Proportion edits pin the edited % and rebalance the rest to 100%
- 0 g contributions use 0 for known macros (null stays null)
- `/log` expandable ingredient breakdown; 166 tests green

### File List

- fitme-ai/lib/domain/nutrition/decompose.ts
- fitme-ai/lib/domain/nutrition/compose.ts
- fitme-ai/lib/domain/nutrition/parse-types.ts
- fitme-ai/lib/domain/nutrition/resolve-parse.ts
- fitme-ai/lib/domain/nutrition/draft-recompute.ts
- fitme-ai/app/(app)/log/ingredient-breakdown.tsx
- fitme-ai/app/(app)/log/log-meal-form.tsx
- fitme-ai/tests/decompose.test.ts
- fitme-ai/tests/nutrition-compose.test.ts
- fitme-ai/tests/draft-recompute.test.ts
- fitme-ai/tests/food-parse-resolve.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/2-4-composite-dish-decomposition.md

### Change Log

- 2026-07-26: Implemented Story 2.4 composite decomposition — status → review
- 2026-07-26: Review patches — pin edited proportion; 0 g → zero known macros

### Review Findings

- [x] [Review][Patch] Pin edited proportion and rebalance others [`decompose.ts`]
- [x] [Review][Patch] Zero-gram lines contribute 0 for known macros, not null totals [`compose.ts`]
