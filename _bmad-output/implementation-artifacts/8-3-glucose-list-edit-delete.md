---
baseline_commit: 82b1540
---

# Story 8.3: Recent list + edit/soft-delete

Status: review

## Story

As a user,
I want to review, fix, or remove glucose readings,
so that mistakes do not linger in my log or charts.

## Acceptance Criteria

1. **Given** I have readings, **when** I open `/glucose`, **then** I see recent entries (newest first) with value, context, and time.
2. **Given** an owned entry, **when** I edit value/unit/context/time/note, **then** the row updates (canonical mg/dL).
3. **Given** an owned entry, **when** I remove it, **then** it is soft-deleted and hidden.
4. **Given** empty history, **when** I view the list, **then** a calm empty state appears.
5. Pattern mirrors Story 5.2 (ownership + soft-delete); tests for update/delete actions.

## Tasks / Subtasks

- [x] Task 1: DAL `updateGlucoseEntry`, `softDeleteGlucoseEntry`, `listRecentGlucoseEntriesForUser`
- [x] Task 2: update/delete actions + schemas
- [x] Task 3: `GlucoseList` with inline edit row
- [x] Task 4: Tests → review

## Dev Agent Record

### File List

- fitme-ai/lib/dal/glucose-entry.ts
- fitme-ai/lib/schemas/glucose.ts
- fitme-ai/app/actions/glucose.ts
- fitme-ai/app/(app)/glucose/glucose-list.tsx
- fitme-ai/app/(app)/glucose/page.tsx
- fitme-ai/tests/glucose-actions.test.ts

### Change Log

- 2026-07-27: Implemented Story 8.3 glucose list edit/delete — status → review

### Review Findings

- [x] [Review][Patch] Edit corrupts measured time across timezones [`glucose-list.tsx:145-177`] — fixed via `lib/domain/datetime-local.ts`.
- [x] [Review][Patch] Duplicate mmol conversion constant [`glucose-list.tsx:252-253`] — fixed: uses `mgDlFromDisplay` from units.

## Verification

- update/delete action tests — pass
