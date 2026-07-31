---
baseline_commit: b332557
---

# Story 11.1: Freemium entitlements + AI parse daily quota

Status: done

## Story

As a product owner preparing for commercial launch,
I want free users limited to a configurable daily AI meal-parse quota while Pro users parse without that cap,
so that AI API costs stay predictable, upgrade moments are natural, and the free offline catalog path remains fully usable.

## Acceptance Criteria

1. **Given** I am on the free plan (default for all users in this story), **when** I call `parseMealAction` and have fewer than `FREE_AI_PARSES_PER_DAY` successful parses today, **then** the parse proceeds as today (AI call, draft returned, `AIInteraction` recorded on success).
2. **Given** I am on the free plan and have already reached today's parse quota, **when** I call `parseMealAction`, **then** the action returns `{ ok: false }` with calm copy explaining the limit and pointing to Quick log / manual entry — **no AI provider call**, **no new `AIInteraction` row**.
3. **Given** quota enforcement, **when** today's count is computed, **then** it uses the profile-timezone calendar day (AD-10) and counts only `AIInteraction` rows where `purpose = "food_parse"` and `status = "succeeded"` — failed parses do not consume quota.
4. **Given** I am on Pro (`Subscription.plan = pro` with effective active/trialing/canceled-at-period-end status per domain rules), **when** I parse meals, **then** daily quota is not applied (abuse rate limit from Story 1.8/2.3 still applies).
5. **Given** I hit the quota on `/log`, **when** the error is shown, **then** copy is supportive (UX-DR2) — no shame; offers Quick log and manual entry; includes a placeholder upgrade hint (link target `/settings/billing` may 404 until Story 11.6 — that's OK).
6. **Given** entitlements are checked server-side, **when** a free user bypasses UI and POSTs the Server Action directly, **then** quota is still enforced (security via DAL/action, not client-only).
7. **Given** catalog instant-log and manual entry, **when** I log food without AI, **then** nothing is blocked by this story — `saveInstantFoodAction`, manual draft save, favorites/recent catalog paths unchanged.
8. **Given** `BILLING_ENABLED=false` in env (optional kill-switch), **when** set, **then** all authenticated users are treated as Pro for quota purposes (useful for closed beta) — document in README.

## Out of Scope (defer to later Epic 11 stories)

- Stripe / PayHere checkout, webhooks, billing UI (Stories 11.3–11.6)  
- Gating progress charts, fasting history, glucose depth, favorites cap (Story 11.5)  
- Offline `smart_parse` queue reconcile calling AI (queue exists in client; server reconcile not implemented yet — note in Dev Agent Record when online queue eventually parses)  
- Redis-backed distributed rate limits (pre-existing defer from Epic 1 review)  

## Tasks / Subtasks

- [x] Task 1: Prisma `Subscription` model + migration (minimal — enables Pro override in 11.2+)
  - [x] Add enums `PlanTier`, `SubscriptionStatus` and model `Subscription` (see Dev Notes → Data model)
  - [x] Add `subscription Subscription?` relation on `User`
  - [x] Migration creates table; **do not** backfill Pro rows — absence = free
  - [x] `npx prisma migrate dev --name subscription` + `npx prisma generate`
- [x] Task 2: Domain — `fitme-ai/lib/domain/billing/entitlements.ts`
  - [x] `PLAN_LIMITS`, `resolveEffectivePlan()`, `EffectivePlan` type
  - [x] Pure functions only — no Prisma imports
  - [x] Unit tests in `tests/entitlements.test.ts`
- [x] Task 3: DAL — `fitme-ai/lib/dal/entitlements.ts`
  - [x] `EntitlementError` with codes: `upgrade_required` | `ai_quota_exceeded`
  - [x] `getSubscription(userId)` — returns null if no row (free)
  - [x] `countAiParsesToday(userId)` — uses `zonedDayBounds` + `AIInteraction` count
  - [x] `getEntitlements(userId)` — plan, limits, `aiParsesRemaining`
  - [x] `assertAiParseAllowed(userId)` — throws `EntitlementError` when quota exceeded
  - [x] Export from `lib/dal/index.ts`
- [x] Task 4: Env — extend `fitme-ai/lib/env.ts` + `.env.example`
  - [x] `FREE_AI_PARSES_PER_DAY` (default `5`, positive int)
  - [x] `BILLING_ENABLED` (default `true`; when `false`, treat all users as Pro for quota)
  - [x] Domain reads limits via a small helper that reads env once (or pass into pure functions from DAL)
- [x] Task 5: Gate `parseMealAction` — `fitme-ai/app/actions/log.ts`
  - [x] Add optional dep `assertAiParseAllowed?: (userId: string) => Promise<void>`
  - [x] Call after `requireSession`, **before** `rateLimit` and **before** `createAiProvider()`
  - [x] Catch `EntitlementError` → `err(message, { code: "ai_quota_exceeded" })` using existing `fieldErrors` slot for machine-readable code (AD-13 — do not change `Result` type in this story)
  - [x] Inject default implementation from DAL
- [x] Task 6: Log UI — `fitme-ai/app/(app)/log/log-meal-form.tsx`
  - [x] When `result.fieldErrors?.code === "ai_quota_exceeded"`, show upgrade hint below error (calm tone; link to `/settings/billing`)
  - [x] Optionally show remaining parses when > 0 (fetch via server prop or lightweight `getEntitlements` in page — keep minimal)
- [x] Task 7: Optional layout hint — `fitme-ai/app/(app)/log/page.tsx`
  - [x] Pass `aiParsesRemaining` from server component to form for subtle "X AI parses left today" when free and ≤ 3 remaining (not required for AC pass — nice UX)
- [x] Task 8: Manual Pro override helper (beta ops — minimal)
  - [x] Document in README: `UPDATE subscription SET plan = 'pro', status = 'active' WHERE user_id = '...'` or add `npm run db:studio` steps — **no admin UI in this story**
  - [x] Seed is **not** required; optional dev script defer OK
- [x] Task 9: Tests
  - [x] `tests/entitlements.test.ts` — `resolveEffectivePlan` matrix (active, trialing expired, canceled with period, past_due grace, expired)
  - [x] `tests/entitlements-dal.test.ts` — mocked prisma: count boundary, Pro skips quota, timezone day boundary
  - [x] Extend `tests/parse-meal-action.test.ts` — quota exceeded does not call AI (`createAiProvider` spy), returns `fieldErrors.code`
  - [x] `BILLING_ENABLED=false` bypass test
- [x] Task 10: README + this story → review
  - [x] Document env vars, tier behavior, manual Pro override for beta
  - [x] Run `npm test`, `npm run typecheck`, `npm run lint` on touched files
  - [x] Ready for `bmad-code-review` before marking done

## Dev Notes

### Business context

Monetization was deferred in the Product Brief until user-success signals (sub-30s logging, 14-day retention, trust in sources). Story 11.1 is **Phase 1**: enforce free-tier AI quota without payment integration. Validates limit tuning before Stripe/PayHere (Stories 11.3–11.4).

**Free tier must stay usable:** Epic 4 offline catalog quick-log and manual entry are the retention hook for free users who hit the cap.

### Data model (add to `fitme-ai/prisma/schema.prisma`)

```prisma
// ---------------------------------------------------------------------------
// Subscriptions (Story 11.1 / Epic 11) — billing providers in 11.3+
// ---------------------------------------------------------------------------

enum PlanTier {
  free
  pro
}

enum SubscriptionStatus {
  trialing
  active
  past_due
  canceled
  expired
}

model Subscription {
  id                    String             @id @default(cuid())
  userId                String             @unique
  user                  User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  plan                  PlanTier           @default(free)
  status                SubscriptionStatus @default(expired)

  /// Stripe/PayHere ids — populated in Stories 11.3–11.4
  stripeCustomerId      String?            @unique
  stripeSubscriptionId  String?            @unique
  payhereSubscriptionId String?            @unique

  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  cancelAtPeriodEnd     Boolean            @default(false)
  trialEndsAt           DateTime?

  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  @@index([status, currentPeriodEnd])
  @@map("subscription")
}
```

Add `subscription Subscription?` to `User`.

**No row = free user.** Only create `Subscription` rows when upgrading to Pro (manual SQL in beta, checkout in 11.3). Do **not** auto-create free rows for every user on registration in this story — keeps migration zero-touch for existing users.

### Domain module sketch

```typescript
// lib/domain/billing/entitlements.ts

export type EffectivePlan = "free" | "pro";

export function resolveEffectivePlan(sub: {
  plan: PlanTier;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  now?: Date;
} | null): EffectivePlan {
  if (!sub || sub.plan !== "pro") return "free";
  // ... status matrix — see conversation sketch; past_due gets 3-day grace after currentPeriodEnd
  return "free";
}

export function freeAiParseLimit(envLimit: number): number {
  return Math.max(0, Math.floor(envLimit));
}
```

When `BILLING_ENABLED=false`, DAL short-circuits: `getEntitlements` returns `plan: "pro"` without reading DB.

### Current code this story touches (read before editing)

#### `fitme-ai/app/actions/log.ts` — `parseMealAction` (lines ~78–131)

Current order:
1. `requireSession` → `userId`
2. `getClientKey` → rate limit key
3. `rateLimit("foodParse", clientKey)` — abuse cap 30/hour (`AI_RATE_LIMITS` in `lib/rate-limit/config.ts`)
4. Zod validate input
5. `createAiProvider()` → AI call
6. `recordAiInteraction` on success/failure

**Insert quota check at step 1.5** (after session, before client key / rate limit):

```typescript
try {
  await assertAiParseAllowed(userId);
} catch (e) {
  if (e instanceof EntitlementError && e.code === "ai_quota_exceeded") {
    return err(e.message, { code: "ai_quota_exceeded" });
  }
  throw e;
}
```

**Preserve:** Existing rate limit remains as abuse backstop for Pro and free. Quota and rate limit serve different purposes (daily fair use vs burst abuse).

**Deps pattern:** `ParseMealActionDeps` already supports injection — add `assertAiParseAllowed` alongside `rateLimit`, `recordAiInteraction`. See `tests/parse-meal-action.test.ts` for exact mock shape.

#### `fitme-ai/lib/dal/ai-interaction.ts` — metering source

Count query (DAL implementation detail):

```typescript
const { start, end } = zonedDayBounds(new Date(), profileTimezone);
await prisma.aIInteraction.count({
  where: {
    userId,
    purpose: "food_parse",
    status: "succeeded",
    createdAt: { gte: start, lt: end },
  },
});
```

Load timezone from `UserProfile.timezone` (same as dashboard day bounds). Fallback `"UTC"` if profile missing (edge case — profile usually exists before logging).

#### `fitme-ai/app/(app)/log/log-meal-form.tsx` — error display (~lines 194–207)

On parse failure, sets `setFormError(result.error)` and `setShowManual(true)`. Extend to detect quota:

```typescript
if (!result.ok) {
  setFormError(result.error);
  setQuotaExceeded(result.fieldErrors?.code === "ai_quota_exceeded");
  setShowManual(true);
}
```

Suggested copy (UX-DR2 — supportive, not nagging):

> "You've used today's free smart parses. Quick log and manual entry still work — or upgrade to Pro for unlimited parsing."

#### `fitme-ai/lib/result.ts` — error codes

Do **not** widen `Result<T>` in this story. Use `fieldErrors.code` as the machine-readable channel:

```typescript
return err(QUOTA_MESSAGE, { code: "ai_quota_exceeded" });
```

Client checks `result.fieldErrors?.code`. Story 11.6 may formalize a typed error code enum.

#### Offline smart parse queue

`log-meal-form.tsx` queues `{ kind: "smart_parse" }` when offline. `reconcileOfflineQueueAction` currently handles **catalog instant items only** — no server-side smart parse replay yet. **No gate needed in offline.ts for 11.1.** When smart parse reconcile lands, reuse `assertAiParseAllowed` there too (add note to `deferred-work.md`).

### Patterns to copy directly

- **DAL module shape:** `lib/dal/water-entry.ts` or `lib/dal/exercise-entry.ts` — `server-only`, prisma via `@/lib/db`, throws domain errors or returns DTOs
- **Pure domain:** `lib/domain/safety/ladder.ts` — no I/O, fully unit tested
- **Action deps injection:** `tests/parse-meal-action.test.ts` — `requireSession`, `rateLimit`, `recordAiInteraction` mocks
- **Day bounds:** `lib/domain/dashboard/day-bounds.ts` — `zonedDayBounds`, `dayKeyForInstant` (15-min step fix from Story 5.4 applies — reuse as-is)
- **Env optional vars:** `lib/env.ts` pattern for `RESEND_API_KEY` — add optional billing vars with defaults

### Pro plan resolution rules (implement in domain tests)

| DB state | Effective plan |
|----------|----------------|
| No subscription row | free |
| `plan: free` or `status: expired` | free |
| `plan: pro`, `status: active` | pro |
| `plan: pro`, `status: trialing`, `trialEndsAt > now` | pro |
| `plan: pro`, `status: trialing`, trial expired | free |
| `plan: pro`, `status: canceled`, `currentPeriodEnd > now` | pro |
| `plan: pro`, `status: past_due`, within 3 days after `currentPeriodEnd` | pro (grace) |
| `BILLING_ENABLED=false` | pro (all users) |

### Tone / UX guardrails

- Never block catalog quick-log or manual entry when quota hit — AC7  
- No red/shame styling for quota message; amber/info tone consistent with estimated-food badges  
- Do not mention specific LKR/USD prices until Story 11.6 — "Upgrade to Pro" is enough  

### Testing requirements

```bash
npx vitest run tests/entitlements.test.ts tests/entitlements-dal.test.ts tests/parse-meal-action.test.ts
npm run typecheck
npm run lint
```

- Mock `@/lib/db` in DAL tests (same as `tests/water-entry-dal.test.ts`)
- Quota test: mock `assertAiParseAllowed` to throw in action test; separate integration-style DAL test for count logic
- Verify `recordAiInteraction` **not** called when quota blocks (spy in action test)
- Verify `createAiProvider` **not** called when quota blocks

### Architecture compliance

| Invariant | How this story honors it |
|-----------|-------------------------|
| AD-1 | Entitlements in `lib/dal/entitlements.ts`; actions call DAL, not Prisma |
| AD-7 | `Subscription.userId` unique; all queries scoped by authenticated user |
| AD-9 | No webhook payloads yet; no billing secrets in logs |
| AD-10 | Quota counted on profile timezone day boundary |
| AD-13 | Quota errors use `err()` envelope with `fieldErrors.code` |

### Previous story intelligence

- **Story 2.3 / 2.10:** `AIInteraction` audit rows with `purpose: "food_parse"` — reuse for metering; do not add parallel counter table  
- **Story 1.8:** Abuse rate limit (30/hr) stays separate from daily quota — both apply  
- **Story 5.4:** `zonedDayBounds` 15-minute step fix — required for Asia/Colombo midnight accuracy in quota window  
- **Epic 1 review defer:** In-memory rate limit not shared across replicas — unchanged; document that quota is DB-backed (correct across instances) while abuse limit is still per-instance  

### Follow-on stories (context for dev — do not implement)

| Story | Delivers |
|-------|----------|
| 11.2 | Auto-create subscription row on register; admin seed for beta Pro |
| 11.3 | Stripe Checkout + Customer Portal + webhook → `applyBillingEvent` |
| 11.4 | PayHere NOTIFY + LKR pricing |
| 11.5 | `assertFeature` gates in `metric-series.ts`, `fasting-session.ts`, `glucose-entry.ts`, favorites |
| 11.6 | `/settings/billing` page, pricing display, upgrade CTAs |

### File structure (expected)

```
fitme-ai/
  lib/domain/billing/entitlements.ts     NEW
  lib/dal/entitlements.ts                NEW
  lib/dal/index.ts                       UPDATE (exports)
  lib/env.ts                             UPDATE
  app/actions/log.ts                     UPDATE
  app/(app)/log/log-meal-form.tsx        UPDATE
  app/(app)/log/page.tsx                 UPDATE (optional remaining count)
  prisma/schema.prisma                   UPDATE
  prisma/migrations/..._subscription/    NEW
  tests/entitlements.test.ts             NEW
  tests/entitlements-dal.test.ts         NEW
  tests/parse-meal-action.test.ts        UPDATE
  .env.example                           UPDATE
  README.md                              UPDATE
_bmad-output/planning-artifacts/epic-11-commercial-freemium.md  NEW
_bmad-output/implementation-artifacts/11-1-freemium-ai-parse-quota.md  (this file)
```

## Dev Agent Record

### Agent Model Used

Cursor Composer

### Completion Notes List

- Added `Subscription` model + migration `20260731045053_subscription`; no backfill — missing row = free tier.
- Pure domain in `lib/domain/billing/entitlements.ts` with `resolveEffectivePlan`, quota helpers, and shared user-facing copy.
- DAL `assertAiParseAllowed` meters from `AIInteraction` (succeeded `food_parse` only) in profile timezone day bounds.
- `readBillingRuntimeConfig` in `lib/billing/config.ts`; `BILLING_ENABLED=false` bypasses quota for closed beta.
- `parseMealAction` gates after session, before abuse rate limit and AI call; returns `fieldErrors.code = ai_quota_exceeded`.
- Log UI: amber quota messaging, Upgrade to Pro link (`/settings/billing` placeholder), low-quota hint when ≤3 parses remain.
- Code review patches: `router.refresh()` after successful parse refreshes remaining-quota hint; `assertAiParseAllowed` billing bypass test added.
- 28 story-scoped unit tests pass; `tsc --noEmit` clean. Full-suite lint has pre-existing errors in unrelated files.

### File List

- fitme-ai/prisma/schema.prisma
- fitme-ai/prisma/migrations/20260731045053_subscription/migration.sql
- fitme-ai/lib/domain/billing/entitlements.ts
- fitme-ai/lib/billing/config.ts
- fitme-ai/lib/dal/entitlements.ts
- fitme-ai/lib/dal/index.ts
- fitme-ai/lib/env.ts
- fitme-ai/app/actions/log.ts
- fitme-ai/app/(app)/log/log-meal-form.tsx
- fitme-ai/app/(app)/log/log-page-content.tsx
- fitme-ai/app/(app)/log/page.tsx
- fitme-ai/tests/entitlements.test.ts
- fitme-ai/tests/entitlements-dal.test.ts
- fitme-ai/tests/billing-config.test.ts
- fitme-ai/tests/parse-meal-action.test.ts
- fitme-ai/.env.example
- fitme-ai/README.md
- fitme-ai/docs/FEATURES-AND-AI-INTEGRATION.md
- _bmad-output/implementation-artifacts/deferred-work.md
- _bmad-output/planning-artifacts/epic-11-commercial-freemium.md
- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/architecture/architecture-FitMe_AI-2026-07-20/ARCHITECTURE-SPINE.md
- .cursor/skills/start-demo-environment/SKILL.md
- .cursor/skills/update-project-docs/reference.md
- _bmad-output/implementation-artifacts/11-1-freemium-ai-parse-quota.md

### Change Log

- 2026-07-31: Story created — status ready-for-dev
- 2026-07-31: Implemented Story 11.1 freemium AI parse quota — status → review
- 2026-07-31: Code review patches — `router.refresh()` after parse; `assertAiParseAllowed` billing bypass test

### Review Findings

**Adversarial self-review (Blind Hunter / Edge Case Hunter / Acceptance Auditor):**

- [x] [Review][Patch] Stale “X parses left today” hint — **Fixed**: `router.refresh()` after successful parse in `log-meal-form.tsx`.
- [x] [Review][Patch] Missing `assertAiParseAllowed` test for `BILLING_ENABLED=false` — **Fixed** in `entitlements-dal.test.ts`.
- [x] [Review][Patch] Quota counted stub `food_parse` rows from manual save/relog (`promptCharLength: 0`) — **Fixed**: meter only rows with `requestMeta.promptCharLength > 0`.
- [ ] [Review][Defer] **TOCTOU race at quota boundary** — two concurrent `parseMealAction` calls when at N-1 parses can both pass `assertAiParseAllowed` before either writes `AIInteraction`. Acceptable for v1; harden with transactional counter or post-hoc reconciliation in a later story if abuse appears.
- [ ] [Review][Defer] **Timezone change resets quota window** — user can shift profile timezone to move day bounds; bounded by 30/hr abuse limit; fix with fixed UTC day key or rolling window in a later story.
- [ ] [Review][Defer] **`/settings/billing` 404** — intentional until Story 11.6; link is a placeholder per AC5.
- [ ] [Review][Defer] **Offline smart_parse queue** — not gated server-side yet (no server replay). Documented in `deferred-work.md`.
- [x] [Review][Discard] Quota blocking AI call — verified by test (`createAiProvider` not invoked).
- [x] [Review][Discard] Failed parses consuming quota — count filters `status: succeeded` only.
- No [Patch] findings required before review sign-off.
