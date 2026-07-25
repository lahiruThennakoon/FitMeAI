---
baseline_commit: bbe22deb711a24e1fabae58d1c1ddcede26ed7b4
---

# Story 1.3: Login & session management

Status: done
## Story

As a returning user,
I want to log in and stay signed in securely,
so that I can access my data quickly and safely.

## Acceptance Criteria

1. **Verified user sign-in creates DB-backed session**
   - **Given** I have a verified account
   - **When** I sign in with correct credentials
   - **Then** a DB-backed session is created and protected routes become accessible (AD-6)

2. **Incorrect credentials are generic**
   - **When** I sign in with incorrect credentials
   - **Then** I get a generic error and no session is created

3. **Revoked session rejected immediately**
   - **Given** an active session
   - **When** the session row is deleted (revoked)
   - **Then** my next request is rejected immediately

4. **A11y + UX**
   - Login form matches register patterns (`h-12`, labels, supportive copy)
   - Unverified users get clear guidance to verify email (not credential enumeration)

## Tasks / Subtasks

- [x] Task 1: Login schema + Server Action (AC: #1, #2)
  - [x] `loginSchema` in `lib/schemas/auth.ts`
  - [x] `loginAction`: Zod → `auth.api.signInEmail` with `headers()` → `Result`
  - [x] Generic error for invalid credentials; supportive message for unverified email
  - [x] Never log email/password (AD-9)

- [x] Task 2: Login UI (AC: #1, #4)
  - [x] Replace `/login` stub with form (mirror register-form patterns)
  - [x] Redirect to protected route on success; try/catch for transport errors

- [x] Task 3: Protected app shell (AC: #1, #3)
  - [x] `app/(app)/dashboard/page.tsx` guarded via DAL `getSession()` / `requireSession()`
  - [x] Unauthenticated users redirected to `/login`

- [x] Task 4: Tests (AC: #1–#3)
  - [x] Unit: loginSchema validation
  - [x] Unit: loginAction success / invalid credentials / unverified email (mocked `signInEmail`)
  - [x] Unit: `getSession` null + `requireSession` throws when session revoked/absent
  - [x] Keep `npm test`, `npm run typecheck` green

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- `loginAction`: Zod → `signInEmail` with Next `headers()` for session cookie; generic credential error; unverified-specific guidance
- `/login` form replaces stub; redirects to `/dashboard` on success
- `/dashboard` protected via DAL `getSession()` → redirect `/login`
- 40 tests passing (login schema/action + session revocation via `requireSession`)

### File List

- fitme-ai/lib/schemas/auth.ts
- fitme-ai/app/actions/auth.ts
- fitme-ai/app/(auth)/login/page.tsx
- fitme-ai/app/(auth)/login/login-form.tsx
- fitme-ai/app/(app)/dashboard/page.tsx
- fitme-ai/tests/login-schema.test.ts
- fitme-ai/tests/login-action.test.ts
- fitme-ai/tests/session.test.ts
- _bmad-output/implementation-artifacts/1-3-login-session-management.md

### Change Log

- 2026-07-25: Implemented Story 1.3 login, session guard, dashboard shell, tests — status → review

### Review Findings

See consolidated Epic 1 review: [epic-1-code-review.md](./epic-1-code-review.md) (2026-07-25). Story status remains `review` pending patch/decision resolution.

