---
baseline_commit: bbe22deb711a24e1fabae58d1c1ddcede26ed7b4
---

# Story 1.5: Account deletion & per-user data isolation

Status: done
## Story

As a privacy-conscious user,
I want to permanently delete my account and be assured my data is isolated,
So that I stay in control of my sensitive health information.

## Acceptance Criteria

1. Authenticated user confirms deletion in Settings → personal data permanently removed (AD-8)
2. Cross-user data access returns not-found/forbidden, never another user's data (AD-7)
3. Every DAL query scoped to authenticated userId
4. Explicit consent interaction; sessions invalidated after deletion
5. Audit event recorded without health payloads

## Tasks / Subtasks

- [x] Task 1: Better Auth deleteUser + cleanup hooks (AC: #1, #5)
  - [x] `user.deleteUser.enabled: true` in `lib/auth.ts`
  - [x] `beforeDelete` → `purgeUserOrphanData` (verification tokens)
  - [x] `afterDelete` → audit log `{ event, userId, outcome }` only

- [x] Task 2: DAL ownership helpers + user cleanup (AC: #2, #3)
  - [x] `NotFoundError` + `requireOwnedResource` in `lib/dal/guards.ts`
  - [x] `lib/dal/user.ts` — `purgeUserOrphanData`, `userExists`

- [x] Task 3: Schema + deleteAccountAction (AC: #1, #4)
  - [x] `deleteAccountSchema` — password + literal `DELETE` confirmation
  - [x] `deleteAccountAction` → `auth.api.deleteUser` with password + headers

- [x] Task 4: Settings UI with consent (AC: #1, #4)
  - [x] `/settings` page (session-guarded)
  - [x] Danger zone form with password + type DELETE
  - [x] Dashboard link to settings

- [x] Task 5: Tests — isolation suite + delete flow (AC: #1–#5)
  - [x] Schema, action, ownership DAL, user DAL tests
  - [x] 62 tests passing

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- Better Auth `deleteUser` enabled with password confirmation; sessions cleared on delete
- `requireOwnedResource` establishes AD-7 pattern for future domain DAL modules
- No domain health tables yet — cascade + `beforeDelete` purge covers auth-layer data
- Settings danger zone mirrors register/login a11y patterns

### File List

- fitme-ai/lib/auth.ts
- fitme-ai/lib/dal/guards.ts
- fitme-ai/lib/dal/user.ts
- fitme-ai/lib/schemas/auth.ts
- fitme-ai/app/actions/auth.ts
- fitme-ai/app/(app)/settings/page.tsx
- fitme-ai/app/(app)/settings/delete-account-form.tsx
- fitme-ai/app/(app)/dashboard/page.tsx
- fitme-ai/tests/delete-account-schema.test.ts
- fitme-ai/tests/delete-account-action.test.ts
- fitme-ai/tests/ownership-dal.test.ts
- fitme-ai/tests/user-dal.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/1-5-account-deletion-data-isolation.md

### Change Log

- 2026-07-25: Implemented Story 1.5 account deletion, DAL isolation helpers, settings UI, tests — status → review

### Review Findings

See consolidated Epic 1 review: [epic-1-code-review.md](./epic-1-code-review.md) (2026-07-25). Story status remains `review` pending patch/decision resolution.

