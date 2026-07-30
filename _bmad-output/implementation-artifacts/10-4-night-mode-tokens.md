---
baseline_commit: 11e5512
---

# Story 10.4: Night mode — warm tokens + fourth appearance mode

Status: backlog

## Story

As a user who reads the app at night,
I want a warm, low-blue-light theme,
so that late-night logging is easier on my eyes without losing chart readability.

## Acceptance Criteria

1. **Given** Night is selected in Settings, **when** any screen renders, **then** warm background/foreground tokens apply (distinct from standard Dark).
2. **Given** the fourth segment, **when** shown in Settings, **then** label is "Night" (not confused with Dark).
3. **Given** macro/chart semantic colors, **when** in Night mode, **then** hue meanings match Light/Dark (calories, protein, etc. unchanged).
4. **Given** Prisma and localStorage, **when** Night is saved, **then** enum includes `night` end-to-end (migration additive).
5. **Given** FOUC guard and ThemeProvider, **when** Night is stored, **then** first paint uses Night tokens (extend init script + class strategy).

## Tasks / Subtasks

- [ ] Task 1: Design tokens in `globals.css` — `.night` or `data-theme="night"` (align with AD-A1 extension)
- [ ] Task 2: Extend `AppearancePreference` type + Prisma enum migration
- [ ] Task 3: Update init script, browser helpers, ThemeProvider resolution
- [ ] Task 4: Fourth segment in `AppearanceControl`
- [ ] Task 5: Contrast audit (WCAG AA) on Night surfaces
- [ ] Task 6: Tests for night resolution + action schema

## Dev Agent Record

### File List

*(not started)*

### Change Log

- 2026-07-30: Story created — deferred Phase 2 per UX CU

## Verification

- Manual: compare Dark vs Night side-by-side on dashboard + progress chart
- Automated: extend `appearance-theme.test.ts` for `night` branch

## Architecture

- AD-A6 (deferred) — implement only when tokens defined in DESIGN.md Phase 2

## UX refs

- `_bmad-output/planning-artifacts/ux-designs/ux-FitMe_AI-2026-07-30/DESIGN.md` — Night token section

## Dependencies

- Stories 10.1–10.3 (MVP theme infrastructure)

## Notes

Do not ship partial Night (enum without tokens). Ship as a single vertical slice.
