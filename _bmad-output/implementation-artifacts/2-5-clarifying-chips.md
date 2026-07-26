---
baseline_commit: 12f938d5af1cb6285c669206238fe268abe1887c
---

# Story 2.5: Clarifying chips for uncertain attributes

Status: review

## Story

As a user,
I want a couple of quick tappable choices only when something's unclear,
so that logging stays fast but precise.

## Acceptance Criteria

1. When an attribute (typically portion) is below the confidence threshold / needs clarification, show 1–3 tappable Clarifying Chips for that attribute (FR-8, UX-DR4)
2. Confident parses show no chips
3. Tapping a chip updates computed nutrition immediately
4. Chip groups per log are capped (≤ 3); chips are keyboard / screen-reader accessible (UX-DR7)

## Tasks / Subtasks

- [x] Task 1: Threshold + chip option builders + apply-chip recompute (pure domain)
- [x] Task 2: Cap chip groups per meal; wire into log draft flow
- [x] Task 3: Accessible chip UI component
- [x] Task 4: Tests + README → review

## Dev Notes

- Reuse `needsClarification` from Story 2.3; confidence threshold stays 0.7.
- Prefer catalog serving names (small/medium/large) when present; else quantity multipliers.
- Do not use free-form inputs for chips — only tappable options.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- Clarifying chips for low-confidence / flagged portion; max 3 groups per log
- Catalog small/medium/large servings preferred; multipliers for estimated foods
- Accessible button group UI; tap recomputes DB or scales estimated macros
- 173 tests green

### File List

- fitme-ai/lib/domain/nutrition/clarifying-chips.ts
- fitme-ai/lib/domain/nutrition/resolve-parse.ts
- fitme-ai/app/(app)/log/clarifying-chips.tsx
- fitme-ai/app/(app)/log/log-meal-form.tsx
- fitme-ai/tests/clarifying-chips.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/2-5-clarifying-chips.md

### Change Log

- 2026-07-26: Implemented Story 2.5 clarifying chips — status → review
- 2026-07-26: Review patch — estimated foods scale macros on chip select

### Review Findings

- [x] [Review][Patch] Estimated/unmatched foods recompute nutrition on chip select [`clarifying-chips.ts`]
