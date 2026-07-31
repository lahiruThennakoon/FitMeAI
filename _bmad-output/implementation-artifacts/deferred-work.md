# Deferred Work

Issues triaged out of active stories during code review.

## Deferred from: code review of 1-2-email-registration (2026-07-24)

- **`getServerEnv()` never called at startup** — `lib/env.ts` defines validation but `lib/auth.ts` reads `process.env` directly. Pre-existing from Story 1.1; wire env validation at app bootstrap in a future hardening story.

## Deferred from: code review of epic-1 (2026-07-25)

- **Orphan user when signup succeeds but verification send fails** — Decision A; cleanup/resend UX later.
- **Injectable `deps` on Server Actions for tests** — refactor to `vi.mock` in hardening pass.
- **Missing DB-level hashed-password / session-invalidation / post-delete cascade integration tests** — unit mocks + BA config for now.
- **Timezone does not yet drive day-boundary aggregation** — AD-10 consumer is later stories.
- **DAL helpers take raw `userId` without `requireSession`** — actions are choke point today.

## Deferred from: code review of 1-7-safety-ladder-on-targets (2026-07-25)

- **Existing goals default to green after migrate** — no backfill of `safetyLevel`/`safetyReasons` from stored targets; mislabeled until user re-saves.
- **Consent not bound to assessment hash** — bare `safetyConsent: true` accepted; OK for authenticated MVP, harden later if needed.
- **Adult calorie/BMI floors for ages 13–17** — no adolescent-specific ladder; needs product/clinical decision.
- **Target-weight underweight path** — ladder assesses current BMI, not destination BMI under a loss plan.

## Deferred from: code review of 1-8-rate-limiting-no-pii-logging (2026-07-26)

- **Edge vs Node separate rate-limit stores** — middleware (Edge) and Server Actions (Node) do not share memory; README already notes single-isolate caveat.
- **Shared `ip:unknown` bucket** — clients with no forwarded IP headers throttle each other; richer fingerprint later.
- **Non-atomic peek/record** — concurrent requests can slightly exceed the configured ceiling in one window.

## Deferred from: code review of 2-1-nutrition-database-schema-seed (2026-07-26)

- **Unique food/ingredient aliases** — alias collisions are slug-ordered for determinism today; enforce uniqueness (or ranked search) when the catalog grows / search story lands.

## Deferred from: code review of 2-2-provider-agnostic-ai-layer (2026-07-26)

- **`getAiProvider` process singleton** — env changes after first call are ignored until process restart; fine for Next server lifetime.
- **Brace-balanced JSON extraction** — trailing prose after a JSON object fails Zod/parse today (fail safe); smarter extract optional later.

## Deferred from: code review of 2-3-natural-language-food-parsing (2026-07-26)

- **Meal-type inference uses server clock** — should use profile timezone (FR-12 / AD-10); needs timezone on the parse action path.
- **Full macro field editors in draft UI** — done in Story 2.6 (confirm/save + macro editors).

## Deferred from: code review of 2-6-review-edit-before-save (2026-07-26)

- **Server-held AI snapshots** — `origin` / `aiSnapshot` are still client-supplied; require snapshot for `ai_parse` today, but a full fix needs a server draft store before save.
- **Idempotent save** — double-click / retry can create duplicate FoodEntry rows; add request key or soft draft id later.
- **Breakdown proportion corrections** — proportion edits recompute macros (captured), but ingredient-line diffs are not stored as separate UserCorrection fields.

## Deferred from: code review of Epics 7–9 (2026-07-27)

- **Scatter same-day fasting_duration** — join keeps last ended fast per calendar day; summing or plotting all sessions deferred.
- **Glucose create time picker** — if product wants backdated log at create (not just edit), add measuredAt to create form.
- **Partial unique index for one active fast** — DAL transaction only (carried from 7.1).
- ~~**`preferredGlucoseUnit` on profile** — per-form unit selection in v1.~~ **Resolved
  2026-07-29:** added `UserProfile.preferredGlucoseUnit` (migration
  `20260729060000_profile_glucose_unit`); list, dashboard glance, and progress axis now
  render the user's unit. Storage stays canonical mg/dL.
- **Metric series Prisma integration tests** — parser tests only.

## Deferred from: Epics 7–9 implementation (2026-07-27)

- **Partial unique index for one active fast per user** — enforced in DAL transaction only; DB constraint optional hardening.
- ~~**`preferredGlucoseUnit` on UserProfile** — unit chosen per log form in v1; profile display preference later.~~ **Resolved 2026-07-29** (see above).
- **Recharts/Visx chart library** — v1 uses SVG; swap renderer when richer charts needed.
- **Metric series integration tests** — parser/action tests only; mocked Prisma coverage for `buildChartPoints` later.
- **Profile sparkline (Story 6.2)** — absorbed into `/progress` default; no duplicate widget.

## Deferred from: Story 11.1 freemium AI parse quota (2026-07-31)

- **Offline `smart_parse` queue reconcile** — client queues smart parse when offline; server reconcile only handles catalog instant items today. When smart parse replay lands, call `assertAiParseAllowed` before invoking AI (same gate as `parseMealAction`).
- **TOCTOU race at quota boundary** — concurrent parses at N-1 can both pass check before audit write; acceptable for v1.
- **Timezone change resets quota window** — profile timezone drives day bounds; user can shift TZ to get a fresh window; bounded by 30/hr abuse limit; fix with UTC day key or rolling window later.
- **Failed audit write skips quota increment** — if `recordAiInteraction` fails after successful AI call, user can repeat without quota advancing; rare; rate limit still applies.
