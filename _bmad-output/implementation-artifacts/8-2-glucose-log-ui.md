---
baseline_commit: 82b1540
---

# Story 8.2: Log UI (value, unit, context, time)

Status: review

## Story

As a user,
I want a dedicated page to log blood sugar with context,
so that I can capture readings quickly with clear non-medical framing.

## Acceptance Criteria

1. **Given** I am signed in, **when** I open `/glucose`, **then** I see a log form: value, unit (mg/dL / mmol/L), context, optional note.
2. **Given** I submit a valid reading, **when** save succeeds, **then** I see success copy and the page refreshes.
3. **Given** invalid input, **when** I submit, **then** field-level or calm error messages appear.
4. Disclaimer on page: personal tracker, not diagnosis or treatment (FR-17).
5. Home nav includes “Log glucose”.

## Tasks / Subtasks

- [x] Task 1: `/glucose` page with `AppPageShell`
- [x] Task 2: `GlucoseLogForm` client component
- [x] Task 3: README + dashboard link → review

## Dev Agent Record

### File List

- fitme-ai/app/(app)/glucose/page.tsx
- fitme-ai/app/(app)/glucose/glucose-log-form.tsx
- fitme-ai/app/(app)/dashboard/page.tsx
- fitme-ai/README.md

### Change Log

- 2026-07-27: Implemented Story 8.2 glucose log UI — status → review

### Review Findings

- [x] [Review][Patch] Create form has no time picker [`glucose-log-form.tsx`] — fixed: `datetime-local` on create with local TZ helpers.

## Verification

- Manual: log mg/dL and mmol/L; verify list updates after refresh
