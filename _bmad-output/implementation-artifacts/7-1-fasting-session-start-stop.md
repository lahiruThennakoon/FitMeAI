---
baseline_commit: 2a74270
---

# Story 7.1: Fasting session model + start/stop

Status: review

## Story

As a user,
I want to start and end a fasting session,
so that my fasting time is saved without medical claims or shame.

## Acceptance Criteria

1. **Given** I have no active fast, **when** I start one (optional planned duration / protocol label), **then** a `FastingSession` is created with `startedAt` and `endedAt = null`.
2. **Given** I have an active fast, **when** I try to start another, **then** it is rejected (at most one active session).
3. **Given** I have an active fast, **when** I end it, **then** `endedAt` is set and duration is available.
4. **Given** I am not the owner, **when** start/end is attempted, **then** it is rejected.
5. Soft-delete column present (AD-8); no medical advice copy.
6. Minimal `/fasting` UI to start/end; tests for start, end, double-start denied, schema.

## Tasks / Subtasks

- [x] Task 1: Prisma `FastingSession` + migration
- [x] Task 2: DAL + Zod + start/end actions
- [x] Task 3: `/fasting` page (start form + end active)
- [x] Task 4: Tests + README + link from Home → review

## Dev Notes

- Enforce single active session in DAL transaction.
- Calm copy: “End fast” not “You broke your fast.”
- Live seconds tick included for usability; 7.2 can polish further.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5

### Completion Notes List

- `FastingSession` model; start rejects if active exists; end sets `endedAt`.
- `/fasting` UI with protocol presets + live elapsed; Home link “Fasting timer”.
- Disclaimer: personal timer, not medical advice.

### File List

- fitme-ai/prisma/schema.prisma
- fitme-ai/prisma/migrations/20260727150000_fasting_session/migration.sql
- fitme-ai/lib/dal/fasting-session.ts
- fitme-ai/lib/schemas/fasting.ts
- fitme-ai/lib/domain/fasting/format.ts
- fitme-ai/app/actions/fasting.ts
- fitme-ai/app/(app)/fasting/page.tsx
- fitme-ai/app/(app)/fasting/fasting-control.tsx
- fitme-ai/app/(app)/dashboard/page.tsx
- fitme-ai/tests/fasting-session-dal.test.ts
- fitme-ai/tests/fasting-actions.test.ts
- fitme-ai/tests/fasting-schema.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/7-1-fasting-session-start-stop.md

### Change Log

- 2026-07-27: Implemented Story 7.1 fasting start/stop — status → review

### Review Findings

- [ ] [Review][Defer] History list → 7.3; Home status chip → 7.4.
- [ ] [Review][Defer] Soft-delete UI for past sessions → 7.3.
- [ ] [Review][Defer] No partial unique index in DB for one active fast — enforced in DAL transaction only.

## Verification

- fasting tests — 11 passed
- `npx tsc --noEmit` — clean
