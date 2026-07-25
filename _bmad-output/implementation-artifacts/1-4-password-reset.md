---
baseline_commit: bbe22deb711a24e1fabae58d1c1ddcede26ed7b4
---

# Story 1.4: Password reset

Status: done
## Story

As a user who forgot my password,
I want to reset it via a secure email link,
so that I can regain access without support.

## Acceptance Criteria

1. Request reset sends single-use, time-limited token email (non-enumerable response)
2. Valid token reset updates hashed password and invalidates prior sessions
3. Expired/used token rejected with clear, non-enumerable message
4. A11y + supportive UX; no email/password in logs

## Tasks / Subtasks

- [x] Task 1: Better Auth reset config (AC: #1, #2)
  - [x] `sendResetPassword` in `lib/auth.ts` via `deliverPasswordResetEmail`
  - [x] `revokeSessionsOnPasswordReset: true`

- [x] Task 2: Schemas + Server Actions (AC: #1, #2, #3)
  - [x] `requestPasswordResetSchema`, `resetPasswordSchema` in `lib/schemas/auth.ts`
  - [x] `requestPasswordResetAction`: Zod → `auth.api.requestPasswordReset` → neutral success always
  - [x] `resetPasswordAction`: Zod → `auth.api.resetPassword` → redirect `/login` or generic error
  - [x] Never log email/password/tokens (AD-9)

- [x] Task 3: UI (AC: #1, #3, #4)
  - [x] `/forgot-password` request form (mirror register/login patterns)
  - [x] `/reset-password` form reads `?token=` from Better Auth redirect
  - [x] Login form link to forgot-password
  - [x] Invalid/missing token → clear message + link to request new link

- [x] Task 4: Email + tests (AC: #1–#3)
  - [x] `lib/email/password-reset-email.ts`
  - [x] Unit: password-reset schema validation
  - [x] Unit: request action neutral success; reset action success / invalid token
  - [x] 49 tests passing (`npm test`)

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- `requestPasswordResetAction` always returns neutral success for valid email (enumeration-safe)
- `resetPasswordAction` maps Better Auth failures to generic “invalid or expired link” message
- Better Auth handles token single-use + expiry; `revokeSessionsOnPasswordReset` clears prior sessions
- `/forgot-password` and `/reset-password` pages follow register/login a11y patterns
- Login form includes “Forgot password?” link

### File List

- fitme-ai/lib/auth.ts
- fitme-ai/lib/email/password-reset-email.ts
- fitme-ai/lib/schemas/auth.ts
- fitme-ai/app/actions/auth.ts
- fitme-ai/app/(auth)/forgot-password/page.tsx
- fitme-ai/app/(auth)/forgot-password/forgot-password-form.tsx
- fitme-ai/app/(auth)/reset-password/page.tsx
- fitme-ai/app/(auth)/reset-password/reset-password-form.tsx
- fitme-ai/app/(auth)/login/login-form.tsx
- fitme-ai/tests/password-reset-schema.test.ts
- fitme-ai/tests/password-reset-action.test.ts
- _bmad-output/implementation-artifacts/1-4-password-reset.md

### Change Log

- 2026-07-25: Implemented Story 1.4 password reset flow, UI, tests — status → review

### Review Findings

See consolidated Epic 1 review: [epic-1-code-review.md](./epic-1-code-review.md) (2026-07-25). Story status remains `review` pending patch/decision resolution.

