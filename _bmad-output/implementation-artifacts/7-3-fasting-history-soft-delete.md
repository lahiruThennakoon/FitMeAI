---
baseline_commit: 82b1540
---

# Story 7.3: Fasting history list + soft-delete

Status: review

## Story

As a user,
I want to see completed fasts and remove mistaken entries from history,
so that my log stays trustworthy without deleting an active fast by accident.

## Acceptance Criteria

1. **Given** I have completed fasts, **when** I open `/fasting`, **then** I see a history list (newest first) with duration, protocol, and start/end times.
2. **Given** a completed session, **when** I remove it, **then** it is soft-deleted (`deletedAt` set) and disappears from the list.
3. **Given** an active fast, **when** I try to remove it from history, **then** the action is rejected with calm copy (“end it first”).
4. **Given** I am not the owner, **when** delete is attempted, **then** it is rejected (AD-7).
5. Tests: soft-delete completed; reject active; action + DAL.

## Tasks / Subtasks

- [x] Task 1: `softDeleteFastingSession` in DAL
- [x] Task 2: `deleteFastingSessionSchema` + `deleteFastingSessionAction`
- [x] Task 3: `FastingHistoryList` on `/fasting`
- [x] Task 4: Tests + README → review

## Dev Agent Record

### Completion Notes List

- History excludes active session from delete targets; only completed rows show Remove.
- `listRecentFastingSessions` feeds history (limit 20).

### File List

- fitme-ai/lib/dal/fasting-session.ts
- fitme-ai/lib/schemas/fasting.ts
- fitme-ai/app/actions/fasting.ts
- fitme-ai/app/(app)/fasting/fasting-history-list.tsx
- fitme-ai/app/(app)/fasting/page.tsx
- fitme-ai/tests/fasting-session-dal.test.ts
- fitme-ai/tests/fasting-actions.test.ts

### Change Log

- 2026-07-27: Implemented Story 7.3 fasting history + soft-delete — status → review

### Review Findings

- [x] [Review][Patch] Fasting history ignores delete failures [`fasting-history-list.tsx:31-35`] — fixed: error state on failed delete.

## Verification

- softDelete tests — pass
- deleteFastingSessionAction test — pass
