---
baseline_commit: 11e5512
---

# Story 10.1: Theme provider + FOUC guard + class-based dark CSS

Status: review

## Story

As a user who prefers dark mode,
I want the app to render in my chosen theme before the first paint,
so that I never see a flash of light background.

## Acceptance Criteria

1. **Given** I previously chose Dark, **when** I load any route, **then** `<html>` has class `dark` before React hydrates.
2. **Given** I chose Match system and OS is dark, **when** the page loads, **then** effective theme is dark.
3. **Given** I chose Light, **when** the page loads, **then** `dark` class is absent regardless of OS.
4. **Given** I am on Match system, **when** OS appearance changes, **then** the app updates without reload.
5. **Given** any screen, **when** using `dark:` Tailwind variants, **then** styles follow the class on `<html>`, not `@media (prefers-color-scheme)` alone.

## Tasks / Subtasks

- [x] Task 1: Domain types — `AppearancePreference`, `resolveEffectiveDark`, `normalizeAppearancePreference`
- [x] Task 2: `lib/appearance/` — constants, browser helpers, init script builder
- [x] Task 3: `ThemeInit` + `ThemeProvider` with context hook `useAppearance`
- [x] Task 4: Root `layout.tsx` — wire init + provider, `suppressHydrationWarning` on `<html>`
- [x] Task 5: `globals.css` — `@custom-variant dark` + `.dark` token overrides
- [x] Task 6: Unit tests — init script, resolve logic, class toggle

## Dev Agent Record

### File List

- fitme-ai/lib/domain/appearance/types.ts
- fitme-ai/lib/appearance/constants.ts
- fitme-ai/lib/appearance/browser.ts
- fitme-ai/lib/appearance/init-script.ts
- fitme-ai/components/theme-init.tsx
- fitme-ai/components/theme-provider.tsx
- fitme-ai/app/layout.tsx
- fitme-ai/app/globals.css
- fitme-ai/tests/appearance-theme.test.ts

### Change Log

- 2026-07-30: Implemented Story 10.1 — status → review
- 2026-07-30: Review patch — profile fallback in FOUC script; `.dark` replaces remaining `prefers-color-scheme` blocks

## Verification

- Manual: set localStorage `fitme-appearance` to `dark`, hard refresh — no light flash
- Automated: `npm test -- appearance-theme`

## Architecture

- AD-A1, AD-A3, AD-A5 from `architecture-FitMe_AI-appearance-2026-07-30`
