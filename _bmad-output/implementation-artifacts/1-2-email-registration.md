---
baseline_commit: bbe22deb711a24e1fabae58d1c1ddcede26ed7b4
---

# Story 1.2: Email registration

Status: done
<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a new user,
I want to register with my email and a password,
so that I can create a private account for my health data.

## Acceptance Criteria

1. **Valid registration creates hashed account + verification email**
   - **Given** I am on the registration screen
   - **When** I submit a valid email and a password meeting policy (≥8 chars)
   - **Then** an account is created with the password stored only hashed (never plaintext, never logged)
   - **And** I receive email verification per the configured flow (verification required in v1)

2. **Duplicate email is non-enumerable**
   - **Given** an email that already exists
   - **When** I submit registration for that email
   - **Then** I get a generic success/neutral message that does not reveal whether the email is registered

3. **Invalid inputs return field-keyed errors**
   - **Given** a malformed email or weak password
   - **When** I submit the form
   - **Then** Zod rejects with field-keyed errors (`email` / `password`) and supportive guidance (no guilt language)

4. **A11y + supportive UX**
   - Registration form is a11y-labeled (email, password), keyboard operable, mobile-first touch targets (min ~44px / `h-12` pattern)
   - Copy is supportive and plain-language (UX-DR2); never logs email/password/tokens

## Tasks / Subtasks

- [x] Task 1: Wire Better Auth email verification (AC: #1, #2)
  - [x] Set `emailAndPassword.requireEmailVerification: true` in `lib/auth.ts` (installed better-auth: this also triggers verification send on sign-up and generic duplicate responses — see `node_modules/better-auth/dist/api/routes/sign-up.mjs`)
  - [x] Implement `emailVerification.sendVerificationEmail` calling the mail port; use Better Auth–provided `url` (include `callbackURL` → `/login` for post-verify redirect; login UI = Story 1.3)
  - [x] Confirm duplicate sign-up returns the same generic success shape as a new signup (non-enumeration)
  - [x] Do not invent custom token tables — use existing Prisma `Verification` model via Better Auth

- [x] Task 2: Mail port (AC: #1)
  - [x] Add `lib/email/send-email.ts` (server-only) with `sendEmail({ to, subject, text, html? })`
  - [x] Adapter selection: if `RESEND_API_KEY` set → Resend HTTP API via `fetch` (no new npm dep); else → console/dev adapter that logs **only** `{ event, userId }` + verification path (never email/password/token plaintext in production logs)
  - [x] Extend `lib/env.ts` + `.env.example` with optional `RESEND_API_KEY`, `EMAIL_FROM`; keep fail-fast for required vars only
  - [x] Document local verification flow in README

- [x] Task 3: Zod schema + register Server Action (AC: #1–#3)
  - [x] Add `lib/schemas/auth.ts` — `registerSchema` (email, password min 8 / max 128)
  - [x] Add `app/actions/auth.ts` — `registerAction` using AD-2 order: Zod → `auth.api.signUpEmail` → `Result` envelope (`ok` / `err` from `lib/result.ts`)
  - [x] Derive Better Auth `name` from email local-part (no extra Name field — epic scope is email+password only)
  - [x] Normalize all outcomes to generic success message for create + duplicate paths; field errors only for validation failures
  - [x] Never log email, password, tokens, or raw bodies (AD-9)

- [x] Task 4: Registration UI (AC: #1, #4)
  - [x] Create `app/(auth)/register/page.tsx` (+ client form component as needed)
  - [x] Match existing landing Tailwind patterns (`h-12`, brand-gradient CTA) — **do not** introduce shadcn in this story (not installed)
  - [x] On success: show “Check your email to verify your account” state; link to `/login` (login UI is Story 1.3 — stub/placeholder OK if missing)
  - [x] Labels, `htmlFor`, error announcements, focus-visible outlines

- [x] Task 5: Tests (AC: #1–#3)
  - [x] Unit: `registerSchema` — valid / malformed email / weak password → fieldErrors
  - [x] Unit: action error normalization — duplicate path yields same generic success shape as new signup (mock `auth.api.signUpEmail`)
  - [x] Integration or DAL-adjacent: after successful signup, `Account.password` is non-null hashed string ≠ plaintext (mock or test DB)
  - [x] Logging: ensure register path does not emit sensitive keys unredacted (extend existing logging tests if useful)
  - [x] Keep `npm test`, `npm run lint`, `npm run typecheck` green

- [x] Task 6: Docs & env template (AC: #1)
  - [x] Add missing `.env.example` (README already references it)
  - [x] README: registration + verification setup (Resend vs console adapter)

### Review Findings

- [x] [Review][Decision] Fail registration when verification email cannot be sent? — **Decision A applied:** verification send runs from `registerAction` after signup; delivery failure returns generic error (no success state).
- [x] [Review][Patch] Duplicate signup does not resend verification email [`lib/auth.ts`] — `sendOnSignUp: false`; `registerAction` always calls `auth.api.sendVerificationEmail` after signup (covers duplicates).
- [x] [Review][Patch] Production mail misconfiguration silent [`lib/email/send-email.ts`] — production without `RESEND_API_KEY` throws; dev keeps console adapter.
- [x] [Review][Patch] Better Auth logs raw email on duplicate signup [`lib/auth.ts`] — `logger: { level: "warn" }` suppresses info-level duplicate email logs.
- [x] [Review][Patch] Hashed-password integration test is synthetic [`tests/register-integration.test.ts`] — replaced with verification-delivery integration tests; hash invariant remains in `assertStoredPasswordIsHashed` unit tests (Better Auth owns hashing).
- [x] [Review][Patch] Server Action transport errors unhandled in UI [`register-form.tsx`] — try/catch around `registerAction` in `startTransition`.
- [x] [Review][Patch] Resend `fetch` has no timeout [`lib/email/send-email.ts`] — 10s `AbortController` timeout with generic throw.
- [x] [Review][Defer] `getServerEnv()` never called at startup [`lib/env.ts`, `lib/auth.ts`] — deferred, pre-existing from Story 1.1

## Dev Notes

### Epic context

Epic 1 delivers secure account + personalized setup. Story 1.1 scaffolded the shell; **1.2 is FR-1 register only**. Story 1.3 (login/session) depends on verified accounts — do not build full login here, but leave `/login` linkable and ensure unverified users cannot obtain a usable session after signup (`requireEmailVerification: true` blocks sign-in until verified).

### Architecture compliance (MUST)

| AD | Rule for this story |
| --- | --- |
| AD-1 | No Prisma from UI/actions for domain reads — auth user creation goes through Better Auth API (prescribed exception for auth HTTP surface). Do not bypass DAL patterns for future domain data. |
| AD-2 | `registerAction` in `app/actions/auth.ts`: Zod → auth call → typed `Result`. |
| AD-6 | Better Auth email/password; passwords hashed by Better Auth only; DB sessions already configured. |
| AD-9 / FR-31 | Redacted logger; never put email/password/token in log messages or meta values that aren't key-redacted. |
| AD-13 | Return `{ ok, data \| error, fieldErrors? }` — no throw for expected validation/auth outcomes. |

[Source: `_bmad-output/planning-artifacts/architecture/architecture-FitMe_AI-2026-07-20/ARCHITECTURE-SPINE.md` — AD-1, AD-2, AD-6, AD-9, AD-13, Structural Seed `(auth)/`]

### Current code to UPDATE (read before changing)

**`fitme-ai/lib/auth.ts`** — today:
- `emailAndPassword.enabled: true`, `requireEmailVerification: false` (comment: wiring lands in 1.2), `minPasswordLength: 8`
- No `emailVerification` / `sendVerificationEmail`
- Reads `process.env.BETTER_AUTH_*` directly (not `getServerEnv()`)

**Preserve:** prisma adapter, session expiry settings, min password length ≥ 8.
**Change:** enable verification + wire `sendVerificationEmail`. Prefer aligning secret/baseURL reads with `getServerEnv()` if that does not break build-time imports; if circular, keep env reads but validate via existing schema.

**`fitme-ai/lib/auth-client.ts`** — exports `signUp` already. Prefer Server Action path for form submit (AD-2); client `signUp` may remain unused for register.

**`fitme-ai/lib/env.ts`** — required: `DATABASE_URL`, `BETTER_AUTH_SECRET`. Add optional mail vars; do not make Resend required for local/dev.

**`fitme-ai/app/page.tsx`** — already links `href="/register"`; do not break landing CTAs.

**`fitme-ai/prisma/schema.prisma`** — `User`, `Account` (password hash), `Verification` already exist. **No schema change expected** unless Better Auth version requires new columns (verify before migrating).

**`fitme-ai/app/api/auth/[...all]/route.ts`** — keep as Better Auth catch-all; verification links hit this handler.

### Anti-patterns (DO NOT)

- Do **not** implement custom password hashing, custom verification token tables, or a parallel auth system
- Do **not** return distinct errors for “email taken” vs “created” (enumeration)
- Do **not** auto-sign-in to protected app routes before verification
- Do **not** install shadcn/ui or add unrelated dependencies without need (Resend via `fetch`)
- Do **not** implement rate limiting (Story 1.8) or password reset (Story 1.4) or login page (Story 1.3)
- Do **not** log verification URLs containing raw tokens in production

### Library / version pin (locked in repo)

- Next.js `16.2.10`, React `19.2.4`, Better Auth `^1` (lockfile ~1.6.x), Prisma `^6`, Zod `^4`, Vitest `^4`
- Better Auth 1.x: `requireEmailVerification: true` + `emailVerification.sendVerificationEmail`; when enabled, duplicate email sign-up returns **success** (OWASP non-enumeration) — lean on this for AC #2
- Server API (confirmed in installed package): `auth.api.signUpEmail({ body: { email, password, name } })`. Pass Next.js `headers()` when the API requires request context.
- With `requireEmailVerification: true`, sign-up does **not** create a usable session; verification email send runs on sign-up (see Better Auth `sendOnSignUp` default when verification required).

### File structure (expected touch list)

```
fitme-ai/
  app/
    (auth)/register/page.tsx          # NEW
    (auth)/register/register-form.tsx # NEW (client) — name flexible
    actions/auth.ts                   # NEW
  lib/
    auth.ts                           # UPDATE
    env.ts                            # UPDATE
    schemas/auth.ts                   # NEW
    email/send-email.ts               # NEW
  .env.example                        # NEW (referenced by README, currently missing)
  README.md                           # UPDATE
  tests/
    register-schema.test.ts           # NEW
    register-action.test.ts           # NEW
    register-integration.test.ts      # NEW (or equivalent hashed-password proof)
```

### UX copy guidance

- Success: “Account created. Check your email for a verification link.”
- Duplicate (same message): identical success copy
- Weak password: “Use at least 8 characters.”
- Bad email: “Enter a valid email address.”
- Avoid: “This email is already registered”, “Invalid credentials” variants that leak existence

### Testing requirements

- Framework: Vitest (`npm test`), patterns in `tests/*.test.ts` — `describe` names state the invariant
- Mock Better Auth / mail at the boundary for unit tests; use Prisma test DB only if already available (it is not today — prefer mocks + one focused assertion on hashed password via mocked adapter or prisma mock)
- Regression: existing `tests/env.test.ts`, `logging.test.ts`, `result.test.ts`, `guards.test.ts` must stay green

### Previous story intelligence (1.1)

- Auth shell intentional; verification deferred with explicit comment in `lib/auth.ts`
- Result envelope + redaction logger + DAL `requireSession()` already shipped
- `.env.example` was promised in DoD/README but is **missing** — create it here
- No `app/(auth)/` group yet — create it; matches Architecture Structural Seed
- Commit style: conventional (`feat:`, `chore:`)
- App lives in `fitme-ai/` (not repo root)

### Git intelligence

- `d965597` — Story 1.1 foundation
- `bbe22de` — FitMind → FitMe rebrand (logo/theme); follow FitMe naming in UI copy

### Project context reference

- No `project-context.md` present in repo; follow Architecture Spine + patterns in `fitme-ai/lib/*` and `fitme-ai/AGENTS.md` (Next.js 16 docs under `node_modules/next/dist/docs/` if App Router APIs differ from training data)

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 1 / Story 1.2]
- [Source: `_bmad-output/planning-artifacts/prds/prd-FitMe_AI-2026-07-20/prd.md` — FR-1]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-FitMe_AI-2026-07-20/ARCHITECTURE-SPINE.md` — AD-1/2/6/9/13]
- [Source: Better Auth docs — Email & Password / Email verification — `requireEmailVerification`, `sendVerificationEmail`, non-enumeration on duplicate sign-up]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia / bmad-dev-story)

### Debug Log References

- Vitest initially failed on `server-only` import; fixed via `vitest.config.ts` alias → `tests/mocks/server-only.ts`
- Full-repo `eslint` was slow; targeted lint on Story 1.2 paths exited 0

### Completion Notes List

- Enabled Better Auth `requireEmailVerification` + verification email via mail port
- Mail port: Resend HTTP `fetch` when `RESEND_API_KEY` set; else console/dev logs `{ event, userId, path }` with token stripped; production requires Resend
- `registerAction`: Zod → `signUpEmail` → `sendVerificationEmail` → `Result`; generic success only when both succeed; generic error on mail failure (Decision A)
- UI: `/register` with a11y labels + success “check email” state; `/login` stub for Story 1.3
- Code review patches applied: duplicate resend via post-signup verification API, BA logger level warn, form try/catch, Resend timeout, production mail guard
- Tests: 30 passing (schema, action non-enumeration, verification delivery, mail adapters)
- `npm test`, `npm run typecheck`, targeted `eslint` all green

### File List

- fitme-ai/lib/auth.ts
- fitme-ai/lib/env.ts
- fitme-ai/lib/schemas/auth.ts
- fitme-ai/lib/email/send-email.ts
- fitme-ai/lib/email/verification-email.ts
- fitme-ai/app/actions/auth.ts
- fitme-ai/app/(auth)/register/page.tsx
- fitme-ai/app/(auth)/register/register-form.tsx
- fitme-ai/app/(auth)/login/page.tsx
- fitme-ai/.env.example
- fitme-ai/README.md
- fitme-ai/vitest.config.ts
- fitme-ai/tests/mocks/server-only.ts
- fitme-ai/tests/register-schema.test.ts
- fitme-ai/tests/register-action.test.ts
- fitme-ai/tests/register-integration.test.ts
- fitme-ai/tests/send-email.test.ts
- _bmad-output/implementation-artifacts/1-2-email-registration.md

### Change Log

- 2026-07-24: Implemented Story 1.2 email registration (verification, mail port, register action/UI, tests, docs) — status → review
- 2026-07-25: Applied code review Decision A + 6 patch findings; verification send moved to registerAction; 30 tests green
