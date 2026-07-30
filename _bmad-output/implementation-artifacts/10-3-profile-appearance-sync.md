---
baseline_commit: 11e5512
---

# Story 10.3: Profile `appearancePreference` migration + sync action

Status: review

## Story

As a signed-in user,
I want my appearance choice saved to my profile,
so that it restores on a new device after I sign in.

## Acceptance Criteria

1. **Given** the database migration runs, **when** existing profiles load, **then** `appearancePreference` defaults to `system`.
2. **Given** I am signed in and change appearance, **when** the toggle completes, **then** `saveAppearancePreferenceAction` persists the enum to my profile.
3. **Given** I am not signed in, **when** I change appearance, **then** localStorage still works and the action returns success without error toast.
4. **Given** invalid input to the action, **when** parsed, **then** Zod rejects with a safe error message.
5. **Given** profile export, **when** exported, **then** `appearancePreference` is included in the DTO.

## Tasks / Subtasks

- [x] Task 1: Prisma enum `AppearancePreference` + column on `UserProfile`
- [x] Task 2: Migration `20260730120000_profile_appearance`
- [x] Task 3: `appearancePreferenceSchema` in `lib/schemas/profile.ts`
- [x] Task 4: DAL `updateAppearancePreference` + `ProfileDto` field
- [x] Task 5: `saveAppearancePreferenceAction` with revalidate `/settings`
- [x] Task 6: Root layout passes `serverAppearance` from profile to `ThemeProvider`
- [x] Task 7: Unit tests for action + schema

## Dev Agent Record

### File List

- fitme-ai/prisma/schema.prisma
- fitme-ai/prisma/migrations/20260730120000_profile_appearance/migration.sql
- fitme-ai/lib/schemas/profile.ts
- fitme-ai/lib/dal/profile.ts
- fitme-ai/lib/domain/targets/types.ts
- fitme-ai/lib/dal/export.ts
- fitme-ai/app/actions/appearance.ts
- fitme-ai/app/layout.tsx
- fitme-ai/tests/appearance-actions.test.ts

### Change Log

- 2026-07-30: Implemented Story 10.3 — status → review

## Verification

- Run `npx prisma migrate deploy` in fitme-ai
- Automated: `npm test -- appearance-actions`
- Manual: signed-in user toggles theme → refresh → preference persists

## Architecture

- AD-A2, AD-A4; parent AD-1, AD-2, AD-7

## Deploy note

Migration required before dev server if column missing: `cd fitme-ai && npx prisma migrate deploy`
