---
baseline_commit: 8c5b2013a4a51603ae56c2043f851b074643bc29
---

# Story 1.8: Rate limiting & no-PII logging hardening

Status: done

## Story

As the system owner,
I want auth endpoints rate-limited and logs free of sensitive data,
so that the app resists abuse and never leaks health/PII.

## Acceptance Criteria

1. **Auth HTTP surface throttled (FR-30)**
   - **Given** repeated requests to `/api/auth/*`
   - **When** the rate exceeds the configured threshold per IP
   - **Then** the response is `429` with a safe, generic body (no internals)

2. **Auth Server Actions throttled (FR-30)**
   - **Given** repeated login / register / password-reset attempts
   - **When** the rate exceeds the per-action threshold per client key (IP)
   - **Then** the action returns a safe error and does not call Better Auth
   - **And** the window resets so legitimate bursts within the limit still pass

3. **No sensitive data in logs (FR-31 / AD-9)**
   - **Given** any logged event or error on representative auth/error paths
   - **When** log meta includes PII/health keys or `Error` objects
   - **Then** values are redacted; Error messages are never emitted raw

4. **Documented limits**
   - README documents auth rate-limit windows and the in-memory store caveat (single-instance / Edge isolate)

## Tasks / Subtasks

- [x] Task 1: Pure rate-limit module + unit tests (AC: #1, #2)
  - [x] Fixed-window (or sliding) counter with injectable store + clock
  - [x] Documented buckets for api-auth / login / register / password-reset
- [x] Task 2: Wire `/api/auth` + middleware (AC: #1)
  - [x] Middleware matcher for `/api/auth/:path*`
  - [x] Safe `429` JSON body; `Retry-After` when useful
- [x] Task 3: Wire auth Server Actions (AC: #2)
  - [x] Enforce before Better Auth calls; injectable for tests
- [x] Task 4: Logging hardening + tests (AC: #3)
  - [x] Expand sensitive keys; never log raw `Error.message`
  - [x] Error-path / redact regression tests
- [x] Task 5: README + story → review (AC: #4)

## Dev Notes

### Architecture

- Capability map: rate limit / no-log-leak → `middleware`, `lib/logging` (AD-9, AD-2)
- Auth HTTP surface is only `app/api/auth/[...all]` (Better Auth). Server Actions call `auth.api.*` in-process — middleware alone does **not** cover them; both layers required.
- Do **not** add Redis yet; in-memory store is fine for MVP with README caveat. AI endpoint limits are Epic 2.

### Existing code to reuse

- `lib/logging` — already redacts by key; extend, don’t replace
- Auth actions already log `{ outcome }` only — keep that; never add email/password
- Injectable `deps` on auth actions (same pattern as Stories 1.2–1.5)

### Limits (document in README)

| Bucket | Limit | Window |
| --- | --- | --- |
| `/api/auth/*` | 60 | 1 minute |
| login action | 10 | 15 minutes |
| register action | 5 | 1 hour |
| password-reset request | 5 | 1 hour |
| password-reset submit | 10 | 1 hour |

### Safe client copy

`Too many attempts. Please try again later.`

### Out of scope

- AI endpoint rate limits (Epic 2 / FR-30 AI)
- Distributed/Redis store
- CAPTCHA

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- Sliding-window in-memory rate limiter in `lib/rate-limit` with injectable store/clock
- Middleware + auth route handler enforce `/api/auth/*` (429 + Retry-After)
- login / register / password-reset Server Actions enforce per-bucket limits before Better Auth
- Logger redacts cookie/authorization keys and never emits raw `Error.message`
- README documents limits and single-instance caveat; 107 tests green

### File List

- fitme-ai/lib/rate-limit/config.ts
- fitme-ai/lib/rate-limit/store.ts
- fitme-ai/lib/rate-limit/check.ts
- fitme-ai/lib/rate-limit/client-key.ts
- fitme-ai/lib/rate-limit/enforce.ts
- fitme-ai/lib/rate-limit/http.ts
- fitme-ai/lib/rate-limit/index.ts
- fitme-ai/middleware.ts
- fitme-ai/app/api/auth/[...all]/route.ts
- fitme-ai/app/actions/auth.ts
- fitme-ai/lib/auth/actions-shared.ts
- fitme-ai/lib/logging/index.ts
- fitme-ai/tests/rate-limit.test.ts
- fitme-ai/tests/login-rate-limit-action.test.ts
- fitme-ai/tests/logging.test.ts
- fitme-ai/tests/helpers/auth-rate-limit.ts
- fitme-ai/tests/login-action.test.ts
- fitme-ai/tests/register-action.test.ts
- fitme-ai/tests/register-integration.test.ts
- fitme-ai/tests/password-reset-action.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/1-8-rate-limiting-no-pii-logging.md

### Change Log

- 2026-07-25: Implemented Story 1.8 rate limiting + logging hardening — status → review
- 2026-07-26: Code review Group 2 (1.8) — findings appended below
- 2026-07-26: Applied all review patches (Decision 1 = tight HTTP path buckets) — status → done

### Review Findings

- [x] [Review][Patch] Map Better Auth HTTP sign-in/sign-up/reset paths to the same tight buckets as Server Actions (Decision 1) [`fitme-ai/lib/rate-limit/http.ts`]
- [x] [Review][Patch] Prefer platform IP headers (`x-vercel-forwarded-for`, `cf-connecting-ip`, `x-real-ip`) before raw `x-forwarded-for` [`fitme-ai/lib/rate-limit/client-key.ts`]
- [x] [Review][Patch] Delete empty keys after prune so the Map cannot grow without bound [`fitme-ai/lib/rate-limit/store.ts`]
- [x] [Review][Patch] Remove duplicate `/api/auth` rate-limit record from route handler (keep middleware) to avoid double-counting when stores share a process [`fitme-ai/app/api/auth/[...all]/route.ts`]
- [x] [Review][Patch] Skip `OPTIONS` in middleware so CORS preflight does not burn the apiAuth budget [`fitme-ai/middleware.ts`]
- [x] [Review][Patch] Rate-limit `deleteAccountAction`; fail closed if client-key/rateLimit throws [`fitme-ai/app/actions/auth.ts`]
- [x] [Review][Patch] Run auth action rate-limit guard before Zod parse (or on all attempts) so invalid-payload spam is throttled [`fitme-ai/app/actions/auth.ts`]
- [x] [Review][Patch] Redact Error-like `{ name, message }` objects and sensitive-ish keys (`message`/`detail`/`error`) [`fitme-ai/lib/logging/index.ts`]
- [x] [Review][Patch] Add deny-path action tests for register / password-reset buckets [`fitme-ai/tests/`]
- [x] [Review][Defer] Edge middleware vs Node action stores are separate isolates — documented MVP caveat [`fitme-ai/README.md`] — deferred, pre-existing multi-instance design
- [x] [Review][Defer] All clients without IP headers share `ip:unknown` [`fitme-ai/lib/rate-limit/client-key.ts`] — deferred, needs richer fingerprint later
- [x] [Review][Defer] Non-atomic peek/record under concurrency [`fitme-ai/lib/rate-limit/check.ts`] — deferred, single-process MVP
