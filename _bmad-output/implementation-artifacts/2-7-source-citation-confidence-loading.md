---
baseline_commit: 8aea2d3
---

# Story 2.7: Source citation, confidence & loading transparency

Status: review

## Story

As a user,
I want to see where each number came from and how confident it is,
so that I believe the data.

## Acceptance Criteria

1. Each displayed nutrition value shows its dataSource (FR-10)
2. `ai_estimated` values show an Estimated badge + confidence and are visually distinct (UX-DR3)
3. While parsing, a loading state shows progress and a helpful tip
4. Mixed-source meals render both treatments clearly; badge contrast is AA-oriented (UX-DR7)

## Tasks / Subtasks

- [x] Task 1: Source citation helpers + SourceBadge component
- [x] Task 2: Wire badges onto item macros + ingredient lines; estimated card chrome
- [x] Task 3: ParseLoading with progress steps + rotating tips
- [x] Task 4: Tests + README → review

## Dev Notes

- Item-level `dataSource` applies to macros; breakdown lines keep their own `dataSource`.
- Confidence is required on Estimated badges; Database omits percent noise.
- Loading tips moved into `ParseLoading` (was inline in log form).

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- SourceBadge + source-citation helpers (FR-10 / UX-DR3)
- Estimated cards amber-distinct; per-macro source chips
- ParseLoading progress + tips
- Unit + component tests

### File List

- fitme-ai/lib/domain/nutrition/source-citation.ts
- fitme-ai/app/(app)/log/source-badge.tsx
- fitme-ai/app/(app)/log/parse-loading.tsx
- fitme-ai/app/(app)/log/log-meal-form.tsx
- fitme-ai/app/(app)/log/ingredient-breakdown.tsx
- fitme-ai/tests/source-citation.test.ts
- fitme-ai/tests/source-badge.test.ts
- fitme-ai/tests/parse-loading.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/2-7-source-citation-confidence-loading.md

### Change Log

- 2026-07-26: Implemented Story 2.7 source citation & loading — status → review

### Review Findings

- [x] [Review][Patch] Loading progress holds on last step (no loop regress) [`parse-loading.tsx`]
- [x] [Review][Patch] Identity rename clears macros so Estimated is not false-labeled DB data [`log-meal-form.tsx`]
- [x] [Review][Patch] UX polish — one source cue per item (not per macro), calmer loading, softer Estimated chrome
