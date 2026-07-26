---
baseline_commit: 5636e3c
---

# Story 2.8: AI-estimated fallback for unknown foods

Status: done

## Story

As a user,
I want unknown foods estimated and clearly labeled,
so that I can still log grandma's jackfruit curry without false precision.

## Acceptance Criteria

1. No catalog match → AI estimate with `dataSource: ai_estimated` + confidence, editable (FR-11)
2. Estimated values are never presented as database-sourced or medically exact
3. Later catalog match preferred over estimate (name rematch)
4. Low-confidence estimates prompt review (`needsClarification`)

## Tasks / Subtasks

- [x] Task 1: Extract estimate/catalog draft builders (`estimate-fallback.ts`)
- [x] Task 2: Resolve path uses builders; rematch action prefers catalog
- [x] Task 3: Log UI copy + name blur rematch
- [x] Task 4: Tests + README → review

## Dev Notes

- Catalog match always wins when found (parse resolve + rematch).
- Fibre/sugar null → 0 on estimates (UX continuity from prior polish).
- Medical disclaimer remains on estimated cards.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- FR-11 builders + rematchFoodDraftAction
- Estimated helper copy; rematch on name blur
- Tests for estimate provenance and catalog upgrade
- Rename from database clears macros so rematch cannot keep false DB numbers as estimates

### File List

- fitme-ai/lib/domain/nutrition/estimate-fallback.ts
- fitme-ai/lib/domain/nutrition/resolve-parse.ts
- fitme-ai/lib/schemas/log.ts
- fitme-ai/app/actions/log.ts
- fitme-ai/app/(app)/log/log-meal-form.tsx
- fitme-ai/tests/estimate-fallback.test.ts
- fitme-ai/tests/rematch-food-action.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/2-8-ai-estimated-fallback.md

### Change Log

- 2026-07-26: Implemented Story 2.8 AI-estimated fallback — status → review
- 2026-07-26: Review patches applied — status → done

### Review Findings

- [x] [Review][Patch] Renaming a database food clears macros before rematch so Estimated cannot inherit DB numbers [`log-meal-form.tsx`]
- [x] [Review][Patch] Skip rematch on no-op blur when catalog already matched [`log-meal-form.tsx`]
- [x] [Review][Defer] Rematch does not call AI to re-estimate after rename-to-unknown — user edits macros or re-parses (acceptable for FR-11 scope)
