---
baseline_commit: pending
---

# Story 11.2: Subscription on register + manual Pro flag (beta)

Status: done

## Story

As a product owner running a closed beta,
I want every new account to get a persisted free subscription row and a simple ops path to grant Pro manually,
so that entitlements are auditable and beta testers can be upgraded without SQL.

## Acceptance Criteria

1. **Given** a user completes registration successfully, **when** `registerAction` finishes signup, **then** a `subscription` row is created with `plan = free` and `status = expired` if one does not already exist.
2. **Given** subscription provisioning fails (DB error), **when** signup and verification otherwise succeed, **then** registration still returns success (best-effort provisioning; missing row still resolves as free per 11.1).
3. **Given** a user already has a subscription row (including Pro), **when** provisioning runs again, **then** the existing row is not downgraded.
4. **Given** an ops email address, **when** I run `npm run billing:grant-pro -- user@example.com`, **then** that user's subscription is upserted to `plan = pro`, `status = active`.
5. **Given** grant script with unknown email, **when** run, **then** it exits non-zero with a clear message.

## Out of Scope

- Stripe / PayHere (11.3–11.4)
- Billing UI (11.6)
- Backfill subscription rows for pre-11.2 users (missing row = free remains valid)

## Tasks / Subtasks

- [x] Task 1: DAL — `lib/dal/subscription.ts`
  - [x] `findUserIdByEmail`, `ensureFreeSubscription`, `grantProSubscription`, `grantProSubscriptionByEmail`, `provisionFreeSubscriptionForEmail`
- [x] Task 2: Wire `registerAction` — best-effort `provisionFreeSubscription` after signup
- [x] Task 3: Ops script — `scripts/grant-pro-subscription.mjs` + `npm run billing:grant-pro`
- [x] Task 4: Tests — `subscription-dal.test.ts`, `register-action.test.ts` updates
- [x] Task 5: README + epic doc updates

## Dev Agent Record

### Implementation Plan

- Reuse `Subscription` model from 11.1; no new migration.
- Register hook uses injectable dep for testability (`provisionFreeSubscription`).
- Grant script mirrors DAL upsert logic (standalone `.mjs` for ops, no server-only import).

### Debug Log

- Better Auth `databaseHooks` not available in installed version — post-signup hook in `registerAction` instead.

### Completion Notes

- New users get explicit free subscription rows; legacy users without rows unchanged.
- Manual Pro via CLI or SQL (README documents both).

## File List

- `fitme-ai/lib/dal/subscription.ts` (new)
- `fitme-ai/app/actions/auth.ts`
- `fitme-ai/lib/auth/actions-shared.ts`
- `fitme-ai/scripts/grant-pro-subscription.mjs` (new)
- `fitme-ai/package.json`
- `fitme-ai/tests/subscription-dal.test.ts` (new)
- `fitme-ai/tests/register-action.test.ts`
- `fitme-ai/README.md`
- `_bmad-output/planning-artifacts/epic-11-commercial-freemium.md`

## Change Log

- 2026-07-31: Story 11.2 implemented — register provisioning + grant-pro script.

### Review Findings

- [x] [Review][Defer] **Race in `ensureFreeSubscription`** — concurrent register retries could double-create; second fails on unique constraint; acceptable for v1.
- [x] [Review][Discard] Grant script exposed via web — CLI-only, no HTTP route.
- [x] [Review][Discard] Register provisioning grants Pro — only creates free/expired rows; Pro requires ops script.
