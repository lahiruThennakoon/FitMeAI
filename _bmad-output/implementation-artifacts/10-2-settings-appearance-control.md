---
baseline_commit: 11e5512
---

# Story 10.2: Settings Appearance control + instant apply

Status: review

## Story

As a user,
I want to pick Match system, Light, or Dark in Settings,
so that the whole app updates immediately without a separate Save step.

## Acceptance Criteria

1. **Given** I open Settings → Display, **when** the section renders, **then** I see a segmented control with Match system / Light / Dark.
2. **Given** I tap a segment, **when** the selection changes, **then** theme applies instantly across the app (no page reload).
3. **Given** I tap the already-selected segment, **when** nothing changes, **then** no redundant server call fires.
4. **Given** accessibility requirements, **when** using keyboard/screen reader, **then** control is a radiogroup with `aria-checked` per option.
5. **Given** copy guidelines, **when** helper text shows, **then** it mentions macro/chart colors stay consistent across modes.

## Tasks / Subtasks

- [x] Task 1: `AppearanceControl` component with three segments
- [x] Task 2: Wire into Settings Display section (`settings/page.tsx` or display form)
- [x] Task 3: Connect to `useAppearance().setAppearance` for instant DOM update
- [x] Task 4: Touch targets ≥44px (`h-11` buttons)

## Dev Agent Record

### File List

- fitme-ai/app/(app)/settings/appearance-control.tsx
- fitme-ai/app/(app)/settings/page.tsx

### Change Log

- 2026-07-30: Implemented Story 10.2 — status → review

## Verification

- Manual: Settings → Display → toggle each segment; confirm instant theme flip
- No toast on toggle (silent apply per UX spine)

## Architecture

- AD-A4 (client-first apply) from appearance spine

## UX refs

- `_bmad-output/planning-artifacts/ux-designs/ux-FitMe_AI-2026-07-30/EXPERIENCE.md` § Appearance control
