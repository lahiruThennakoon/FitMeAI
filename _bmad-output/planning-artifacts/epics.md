---
stepsCompleted: ["step-01", "step-02", "step-03"]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-FitMe_AI-2026-07-20/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-FitMe_AI-2026-07-20/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/briefs/brief-FitMe_AI-2026-07-20/brief.md
---

# FitMind AI - Epic Breakdown

## Overview

This document decomposes the FitMind AI MVP requirements (from the PRD and Architecture Spine) into implementable epics and stories. UX requirements are embedded in the PRD (§10 Information Architecture, §11 Aesthetic & Tone) and are folded into the relevant feature stories rather than a standalone UX epic. Each story includes acceptance criteria in Given/When/Then form plus edge cases, dependencies, test scenarios, and a definition of done, so a single developer agent can implement it end to end.

## Requirements Inventory

### Functional Requirements

- FR-1: Email registration & sign-in
- FR-2: Password reset
- FR-3: Account deletion & per-user data isolation
- FR-4: Create/edit User Profile & compute Targets (BMR/TDEE, formulas shown)
- FR-5: Safety Ladder on unsafe Targets (green/yellow/red-with-consent)
- FR-6: Natural-language food parsing into structured, editable Food Entries
- FR-7: Composite-dish decomposition & bottom-up nutrition calculation
- FR-8: Clarifying Chips for uncertain attributes
- FR-9: Review & edit before save
- FR-10: Source citation & transparency (data source + confidence)
- FR-11: AI-estimated fallback for unknown foods
- FR-12: Set meal type, quantity, unit, datetime (timezone-correct)
- FR-13: Auto Baseline Burn from profile
- FR-14: Manual exercise logging with estimated calories burned
- FR-15: Net-calorie & macro dashboard
- FR-16: Cached instant-path offline fallback
- FR-17: No medical advice / safe-language guardrails
- FR-18: Structured, schema-validated AI outputs
- FR-19: AI Interaction logging (provenance)
- FR-20: User Correction capture
- FR-30: Rate limiting on auth and AI endpoints
- FR-31: No sensitive health/PII data in logs or error messages

### NonFunctional Requirements

- NFR-Perf: Dashboard interactions feel instant; smart-path parse p95 target ~4s connected; instant-path works offline.
- NFR-Sec: Input validation everywhere; OWASP Top 10 protection; rate limiting; secure secrets; encryption in transit.
- NFR-A11y: WCAG 2.1 AA; usable one-handed on phone; adequate contrast and touch targets.
- NFR-Responsive: Correct across Android tablet, iPhone, laptop; mobile-first.
- NFR-Reliability: Audit logging for important operations; errors never leak health data.
- NFR-AIIndependence: Provider-agnostic AI service layer; no single-provider coupling.

### Additional Requirements

*(From Architecture Spine — greenfield project, no external starter; conventions from AD-1..AD-13.)*

- Greenfield scaffold: Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind 4 + shadcn/ui + Prisma 6 + PostgreSQL + Better Auth 1.x. No external boilerplate; scaffold established in Epic 1 Story 1.
- Server-only Data Access Layer (`lib/dal/`) is the sole data + authorization choke point (AD-1).
- All mutations are Zod-validated Server Actions in `app/actions/` (AD-2).
- Nutrition source-of-truth is curated DB; AI never invents stored numbers; every value carries dataSource + confidence (AD-3).
- Provider-agnostic AI port (`lib/ai/`) with Zod-validated outputs; v1 adapter = Google Gemini (AD-4).
- AI safety guardrails run before display/persist (AD-5).
- Better Auth with DB-backed sessions, immediate revocation (AD-6).
- Every domain row user-owned; queries user-scoped (AD-7).
- Soft-delete + audit for AI values and corrections; account deletion hard-removes health data (AD-8).
- Redacted logging; no PII/health in logs (AD-9).
- UTC storage; day computed in profile timezone (AD-10).
- Canonical units in storage (g, kcal, cm); convert at edges (AD-11).
- Offline instant-path client cache; idempotent reconcile on reconnect (AD-12).
- Uniform ID scheme + typed result envelope `{ok, data|error}` (AD-13).

### UX Design Requirements

*(Embedded in PRD §10–§11; extracted here as actionable items.)*

- UX-DR1: Mobile-first responsive layouts for Android tablet, iPhone, laptop; one-handed phone use (large touch targets, reachable primary actions).
- UX-DR2: Supportive, non-judgmental copy across all system/AI text; no guilt or shaming language.
- UX-DR3: Trust cues as first-class UI — visible data source per value, "Estimated" confidence badge, loading state with helpful hints.
- UX-DR4: Clarifying Chips as tappable multiple-choice controls (not free-form forms), bounded to protect the sub-30s log.
- UX-DR5: Net-calorie dashboard with simple, glanceable progress indicators (nudge, not nag).
- UX-DR6: Safety ladder visual treatment — green/yellow/red states with an explicit consent interaction for red.
- UX-DR7: WCAG 2.1 AA — contrast, focus states, keyboard navigation, screen-reader labels.
- UX-DR8: Key screens: Onboarding/Profile setup, Home Dashboard, Quick Food Entry, Food-Entry Review, Exercise Entry, Goals, Settings (units, privacy/consent, deletion, export).

### FR Coverage Map

- FR-1: Epic 1 — Email registration & sign-in
- FR-2: Epic 1 — Password reset
- FR-3: Epic 1 — Account deletion & data isolation
- FR-4: Epic 1 — Profile & target computation
- FR-5: Epic 1 — Safety ladder
- FR-30: Epic 1 — Rate limiting (auth) + Epic 2 (AI)
- FR-31: Epic 1 — No-PII logging (cross-cutting, established here)
- FR-6: Epic 2 — Natural-language parsing
- FR-7: Epic 2 — Composite decomposition & calc
- FR-8: Epic 2 — Clarifying chips
- FR-9: Epic 2 — Review & edit before save
- FR-10: Epic 2 — Source citation & confidence
- FR-11: Epic 2 — AI-estimated fallback
- FR-12: Epic 2 — Meal type/quantity/unit/datetime
- FR-17: Epic 2 — AI safety guardrails
- FR-18: Epic 2 — Schema-validated AI outputs
- FR-19: Epic 2 — AI interaction logging
- FR-20: Epic 2 — User correction capture
- FR-13: Epic 3 — Auto baseline burn
- FR-14: Epic 3 — Manual exercise logging
- FR-15: Epic 3 — Net-calorie dashboard
- FR-16: Epic 4 — Cached instant-path offline

## Epic List

### Epic 1: Secure Account & Personalized Setup
Users can create a secure account and set up a personal profile that yields safe, personalized daily targets — the foundation every other feature builds on.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-30 (auth), FR-31

### Epic 2: Effortless, Trustworthy Food Logging
Users can log food in natural language and get precise, sourced nutrition in seconds, correcting anything before saving — the beating heart of the product.
**FRs covered:** FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-17, FR-18, FR-19, FR-20, FR-30 (AI)

### Epic 3: Activity & the Daily Dashboard
Users see calories in vs. out and their daily standing at a glance, with baseline burn auto-estimated and workouts logged manually.
**FRs covered:** FR-13, FR-14, FR-15

### Epic 4: Offline-Ready PWA
Users can install FitMind AI and keep logging common foods instantly even on weak or no network, with entries reconciled when back online.
**FRs covered:** FR-16

---

## Epic 1: Secure Account & Personalized Setup

Deliver a complete, secure account and onboarding experience: registration, login, password reset, account deletion with strict per-user isolation, and profile-driven target calculation with a safety ladder. After this epic a user has a personalized, safe set of daily targets.

### Story 1.1: Project foundation & authenticated app shell

**Status: Done (2026-07-20)** — scaffolded Next.js 16 + TS + Tailwind 4 + Prisma 6 + Better Auth + server-only DAL + redaction logging + result envelope + PWA shell + health check; lint, typecheck, 9 unit tests, and production build all green; CI workflow added.

As a developer,
I want a scaffolded Next.js 16 project with the DAL pattern, database, auth base, and PWA shell wired,
So that every subsequent story builds on consistent, secure foundations.

**Acceptance Criteria:**

**Given** a clean repository
**When** the project is scaffolded
**Then** Next.js 16 (App Router, Turbopack), TypeScript, Tailwind 4, shadcn/ui, Prisma 6 + PostgreSQL, and Better Auth are installed and configured
**And** a `server-only` DAL directory (`lib/dal/`), `app/actions/` convention, `lib/schemas/`, and a redacted logging module exist per AD-1/AD-2/AD-9
**And** a PWA manifest + service worker baseline and a responsive app shell render on mobile and desktop
**And** a health-check route and a passing CI pipeline (lint, typecheck, test) run green.

- **Edge cases:** missing env vars fail fast with a clear (non-secret) message; DB connection uses a singleton to avoid pool exhaustion.
- **Dependencies:** none (first story).
- **Test scenarios:** app boots; health check returns ok; a sample DAL function rejects an unauthenticated call; CI runs unit test scaffolding.
- **Definition of done:** repo builds, CI green, README run instructions, no secrets committed, `.env.example` present.

### Story 1.2: Email registration

As a new user,
I want to register with my email and a password,
So that I can create a private account for my health data.

**Acceptance Criteria:**

**Given** I am on the registration screen
**When** I submit a valid email and a password meeting policy
**Then** an account is created with the password stored only hashed (never plaintext, never logged)
**And** I receive email verification per the configured flow [ASSUMPTION: verification required in v1]
**When** I submit an email that already exists
**Then** I get a generic message that does not reveal whether the email is registered.

- **Edge cases:** weak password rejected with guidance; malformed email rejected by Zod; duplicate email is not enumerable.
- **Dependencies:** 1.1.
- **Test scenarios:** valid signup persists hashed password; duplicate signup non-enumerable; invalid inputs return field-keyed errors.
- **Definition of done:** FR-1 (register) met; unit + integration tests; a11y-labeled form; supportive copy (UX-DR2).

### Story 1.3: Login & session management

As a returning user,
I want to log in and stay signed in securely,
So that I can access my data quickly and safely.

**Acceptance Criteria:**

**Given** I have a verified account
**When** I sign in with correct credentials
**Then** a DB-backed session is created and protected routes become accessible (AD-6)
**When** I sign in with incorrect credentials
**Then** I get a generic error and no session is created
**Given** an active session
**When** the session row is deleted (revoked)
**Then** my next request is rejected immediately.

- **Edge cases:** repeated failed logins are rate-limited (ties to 1.8); expired session redirects to login.
- **Dependencies:** 1.1, 1.2.
- **Test scenarios:** successful login sets session; wrong password rejected; revoked session denies access on next call.
- **Definition of done:** FR-1 (sign-in) met; protected route guard via DAL `requireSession()`; tests; a11y.

### Story 1.4: Password reset

As a user who forgot my password,
I want to reset it via a secure email link,
So that I can regain access without support.

**Acceptance Criteria:**

**Given** I request a reset for my email
**When** the request is processed
**Then** a single-use, time-limited reset token is emailed
**When** I complete the reset with a valid token
**Then** my password is updated (hashed) and all prior sessions are invalidated
**When** I use an expired or already-used token
**Then** the reset is rejected with a clear, non-enumerable message.

- **Edge cases:** requesting reset for unknown email returns the same neutral response (no enumeration).
- **Dependencies:** 1.1, 1.2.
- **Test scenarios:** token single-use; token expiry enforced; sessions invalidated post-reset.
- **Definition of done:** FR-2 met; tests; a11y; supportive copy.

### Story 1.5: Account deletion & per-user data isolation

As a privacy-conscious user,
I want to permanently delete my account and be assured my data is isolated,
So that I stay in control of my sensitive health information.

**Acceptance Criteria:**

**Given** I am authenticated in Settings
**When** I confirm account deletion
**Then** my personal health data is permanently removed and is irrecoverable through the app (AD-8 exception)
**Given** any data request
**When** it targets a record I do not own
**Then** the system returns not-found/forbidden and never another user's data (AD-7)
**And** every DAL query is scoped to my authenticated userId.

- **Edge cases:** deletion is confirmed with an explicit consent interaction; in-flight sessions are invalidated after deletion.
- **Dependencies:** 1.1, 1.3.
- **Test scenarios:** cross-user access denied; post-deletion data absent; ownership scoping enforced in DAL tests.
- **Definition of done:** FR-3 met; isolation test suite; consent UI; audit event recorded (without health payloads).

### Story 1.6: Create/edit profile & compute targets

As a new user,
I want to enter my details and get suggested daily targets with the formula shown,
So that I have personalized, transparent goals I can trust or adjust.

**Acceptance Criteria:**

**Given** I am onboarding
**When** I enter name, age, sex, height, current weight, activity level, dietary preferences, target weight, goal type, preferred units, country, and timezone
**Then** the system computes suggested Targets (calories, protein, carbs, fat, fibre, water, steps, exercise minutes, weekly weight-change) using a documented formula (Mifflin-St Jeor for BMR) with inputs, formula, and a "these are estimates, not medical advice" limitation visible
**When** I change weight or activity level
**Then** suggested Targets recompute
**And** I can override any Target
**And** values persist in canonical units (g, kcal, cm) and display in my preferred units (AD-11).

- **Edge cases:** implausible inputs (e.g., age 0) rejected; unit toggle converts consistently; timezone drives day boundaries (AD-10).
- **Dependencies:** 1.1, 1.3.
- **Test scenarios:** BMR/TDEE computed correctly for known inputs; unit conversion round-trips; overrides persist.
- **Definition of done:** FR-4 met; nutrition-calc unit tests; formula transparency UI; a11y.

### Story 1.7: Safety ladder on targets

As a user setting an ambitious goal,
I want to be warned when a target is unsafe and give explicit consent for dangerous ones,
So that I am protected from harmful crash targets while keeping control.

**Acceptance Criteria:**

**Given** I set a Target the system flags as moderately unsafe
**When** I save
**Then** a yellow warning labeled "not recommended" appears and I may proceed without a hard block
**Given** I set a dangerous Target (below the safe calorie floor ~1200 kcal women / ~1500 men, or already-underweight BMI, or weekly change beyond ~1% bodyweight — cited in-app)
**When** I save
**Then** a red warning requires explicit consent/acknowledgement before saving
**And** the system never recommends supplements/medication and points to professional advice where appropriate
**And** the safety decision (warning shown, consent given) is recorded.

- **Edge cases:** threshold boundaries tested exactly; consent is revocable by editing the target back to safe.
- **Dependencies:** 1.6.
- **Test scenarios:** yellow vs red thresholds; consent gating; no-medical-advice copy check.
- **Definition of done:** FR-5 met; threshold unit tests with cited sources; green/yellow/red UI (UX-DR6); recorded decision.

### Story 1.8: Rate limiting & no-PII logging hardening

As the system owner,
I want auth endpoints rate-limited and logs free of sensitive data,
So that the app resists abuse and never leaks health/PII.

**Acceptance Criteria:**

**Given** repeated requests to auth (and later AI) endpoints
**When** the rate exceeds the configured threshold per user/IP
**Then** requests are throttled with a safe error (FR-30)
**Given** any logged event or error
**When** logs are inspected across representative flows
**Then** no health/body/PII values appear (FR-31, AD-9).

- **Edge cases:** throttle resets after window; legitimate bursts within limit pass.
- **Dependencies:** 1.1, 1.3.
- **Test scenarios:** throttle triggers/release; log-redaction check on error paths.
- **Definition of done:** FR-30 (auth), FR-31 met; redaction middleware tested; documented limits.

---

## Epic 2: Effortless, Trustworthy Food Logging

Deliver the core pipeline: natural-language logging that decomposes dishes, matches a curated database, asks minimal clarifying questions, shows sources/confidence, lets the user correct before saving, and audits every AI value. After this epic a user can log a real Sri Lankan meal in seconds and trust the numbers.

### Story 2.1: Nutrition database schema & Sri Lankan seed data

As a user,
I want the app to know common Sri Lankan foods and their ingredients,
So that my everyday meals produce accurate, sourced nutrition.

**Acceptance Criteria:**

**Given** the database is migrated and seeded
**When** I look up a seeded food (e.g., pol sambol, dhal curry, rice)
**Then** it returns ingredient-level nutrition from the curated source with a `dataSource = database`
**And** the schema supports Food, Ingredient, FoodServing, RecipeIngredient with indexes, timestamps, and canonical units (AD-3, AD-11)
**And** seed data includes the PRD's Sri Lankan food list sourced from the hybrid dataset (public open dataset + hand-curated seed).

- **Edge cases:** duplicate foods de-duplicated; missing macro marked null (not fabricated).
- **Dependencies:** 1.1.
- **Test scenarios:** seed loads; composite food resolves to ingredients; DB-sourced values carry provenance.
- **Definition of done:** FR-7 data layer; seed script; migration; data-source provenance; DB tests.

### Story 2.2: Provider-agnostic AI layer with schema-validated outputs

As a developer,
I want a swappable AI port whose outputs are schema-validated,
So that the app is not coupled to one provider and never consumes malformed/unsafe AI output.

**Acceptance Criteria:**

**Given** the AI port (`AiProvider`) with a Gemini adapter
**When** any AI call is made
**Then** the response is parsed against a Zod schema before use (FR-18, AD-4)
**When** a response fails validation
**Then** it fails safe — no entry is produced — and the caller can retry or fall back to manual (AD-4)
**And** switching the provider requires only an adapter/config change, no call-site changes (NFR-AIIndependence).

- **Edge cases:** malformed JSON; partial fields; provider timeout handled with safe error.
- **Dependencies:** 1.1.
- **Test scenarios:** valid parse; invalid parse fails safe; adapter swap via config.
- **Definition of done:** FR-18 met; port + Gemini adapter; schema tests with fixtures; timeout handling.

### Story 2.3: Natural-language food parsing into structured entries

As a user,
I want to type what I ate in plain language and get structured food entries,
So that logging is effortless.

**Acceptance Criteria:**

**Given** I enter "two eggs, one milk tea, 100g chickpeas, one dhal wade"
**When** the AI parses it
**Then** I get structured, editable items (name, quantity, unit, calories, protein, carbs, fat, fibre, sugar, sodium, meal type, datetime, dataSource, confidence) (FR-6)
**And** each item carries a dataSource (`database` or `ai_estimated`)
**When** parsing fails
**Then** it degrades gracefully to manual entry, never a dead end.

- **Edge cases:** ambiguous quantities flagged for chips (2.5); mixed known/unknown foods handled per-item.
- **Dependencies:** 2.1, 2.2.
- **Test scenarios:** multi-item parse; graceful failure; per-item source assignment.
- **Definition of done:** FR-6 met; parse tests; manual fallback; loading state (UX-DR3).

### Story 2.4: Composite-dish decomposition & bottom-up calculation

As a user,
I want composite dishes broken into ingredients and totaled from them,
So that "rice and curry" gets accurate nutrition.

**Acceptance Criteria:**

**Given** I log a composite dish
**When** it is processed
**Then** it is decomposed into ingredients with proportions and its nutrition is the sum of ingredient contributions within rounding (FR-7)
**And** I can view the ingredient breakdown.

- **Edge cases:** unknown ingredient falls back to estimate (2.8); proportions normalize to 100%.
- **Dependencies:** 2.1, 2.3.
- **Test scenarios:** totals equal ingredient sums; breakdown viewable; proportion edits recompute.
- **Definition of done:** FR-7 met; calculation unit tests; breakdown UI.

### Story 2.5: Clarifying chips for uncertain attributes

As a user,
I want a couple of quick tappable choices only when something's unclear,
So that logging stays fast but precise.

**Acceptance Criteria:**

**Given** an attribute (typically portion) is below the confidence threshold
**When** the entry is shown
**Then** a bounded set (1–3) of tappable Clarifying Chips appears for that attribute (FR-8, UX-DR4)
**When** the parse is confident
**Then** no chips appear
**When** I tap a chip
**Then** the computed nutrition updates immediately.

- **Edge cases:** never exceed the chip cap; chips keyboard/screen-reader accessible (UX-DR7).
- **Dependencies:** 2.3, 2.4.
- **Test scenarios:** chips appear only under threshold; cap enforced; selection recomputes.
- **Definition of done:** FR-8 met; threshold logic tests; accessible chip component.

### Story 2.6: Review & edit before save (+ correction capture)

As a user,
I want to check and fix values before saving,
So that I trust what gets recorded and the app learns from my fixes.

**Acceptance Criteria:**

**Given** an AI-produced set of entries
**When** I review them
**Then** I can edit food identity, quantity, unit, and macros before saving (FR-9)
**When** I save
**Then** no AI-produced entry persists without passing the confirm/edit step
**And** each edit of an AI value is captured as a User Correction (before/after, timestamp) (FR-20, AD-8).

- **Edge cases:** editing recomputes dependent totals; discarding leaves nothing persisted.
- **Dependencies:** 2.3, 2.4.
- **Test scenarios:** edit persists override; correction recorded; no silent save.
- **Definition of done:** FR-9, FR-20 met; correction table + tests; review UI.

### Story 2.7: Source citation, confidence & loading transparency

As a user,
I want to see where each number came from and how confident it is,
So that I believe the data.

**Acceptance Criteria:**

**Given** a set of entries
**When** they are displayed
**Then** each value shows its dataSource; `ai_estimated` values show an "Estimated" badge + confidence and are visually distinct (FR-10, UX-DR3)
**Given** processing is underway
**When** I wait
**Then** a loading state shows progress and a helpful hint/tip.

- **Edge cases:** mixed-source entries render both treatments clearly; contrast meets AA (UX-DR7).
- **Dependencies:** 2.3.
- **Test scenarios:** source rendering; estimated badge; loading hints.
- **Definition of done:** FR-10 met; component tests; a11y contrast check.

### Story 2.8: AI-estimated fallback for unknown foods

As a user,
I want unknown foods estimated and clearly labeled,
So that I can still log grandma's jackfruit curry without false precision.

**Acceptance Criteria:**

**Given** no database match exists for a food
**When** it is logged
**Then** the system produces an AI estimate with dataSource `ai_estimated` and a confidence level, editable by me (FR-11)
**And** estimated values are never presented as database-sourced or medically exact.

- **Edge cases:** later DB match preferred over estimate; low-confidence prompts review.
- **Dependencies:** 2.2, 2.6, 2.7.
- **Test scenarios:** unknown food estimated + labeled; editable; provenance correct.
- **Definition of done:** FR-11 met; fallback tests; labeling verified.

### Story 2.9: AI safety guardrails

As a user,
I want the AI to never give medical advice or shame me,
So that the app is safe and supportive.

**Acceptance Criteria:**

**Given** any AI-generated user-facing text
**When** it is produced
**Then** it passes a guardrail check before display/persist; violations are blocked/regenerated (FR-17, AD-5)
**And** the AI never diagnoses, recommends medication/supplements, or uses guilt/judgmental language
**And** estimated values are always marked; the AI never invents precise values presented as known.

- **Edge cases:** adversarial prompts do not elicit medical advice; regeneration bounded then safe-fail.
- **Dependencies:** 2.2.
- **Test scenarios:** guardrail blocks unsafe outputs; tone check; estimate labeling enforced.
- **Definition of done:** FR-17 met; guardrail tests incl. adversarial cases; supportive copy.

### Story 2.10: AI interaction audit logging

As the system owner,
I want every AI-produced value traceable,
So that estimates are auditable and trust is defensible.

**Acceptance Criteria:**

**Given** an AI estimation or parse
**When** it produces a saved entry
**Then** an AI Interaction record links to that entry (provider-agnostic reference, response, confidence) (FR-19, AD-8)
**And** no sensitive health data appears in application logs or errors (FR-31, AD-9).

- **Edge cases:** failed AI calls also recorded (without sensitive payloads); PII redaction verified.
- **Dependencies:** 2.2, 2.6.
- **Test scenarios:** estimated entry links to interaction; log redaction on AI paths; rate limiting on AI endpoints (FR-30).
- **Definition of done:** FR-19, FR-30 (AI), FR-31 met; audit table + tests.

---

## Epic 3: Activity & the Daily Dashboard

Deliver the calories-out side and the reflective dashboard: baseline burn from the profile, manual workouts on top, and a glanceable net-calorie view. After this epic a user sees their daily standing and is nudged to decide their next move.

### Story 3.1: Auto baseline burn

As a user,
I want my baseline daily burn estimated automatically,
So that net calories work even if I log no exercise.

**Acceptance Criteria:**

**Given** my profile exists
**When** I open the dashboard
**Then** Baseline Burn is computed from BMR + activity level, with the formula and limitations shown (FR-13)
**And** Net Calories is computable with zero exercise entries
**When** relevant profile values change
**Then** Baseline Burn recomputes.

- **Edge cases:** missing activity level defaults conservatively with a note; unit consistency (AD-11).
- **Dependencies:** 1.6.
- **Test scenarios:** baseline for known inputs; recompute on change; net with no exercise.
- **Definition of done:** FR-13 met; formula tests; transparency UI.

### Story 3.2: Manual exercise logging

As a user,
I want to log workouts and see estimated calories burned,
So that my activity counts toward net calories.

**Acceptance Criteria:**

**Given** I log an Exercise Entry (type, duration, intensity; optional distance/sets/reps/weight/notes)
**When** I save
**Then** I get an estimated calories-burned value labeled as an estimate, not exact (FR-14)
**And** supported types include walking, running, treadmill, cycling, strength, swimming, sports, and custom.

- **Edge cases:** custom exercise persists; zero-duration rejected; estimate labeled.
- **Dependencies:** 1.6.
- **Test scenarios:** estimate for known inputs; custom type; validation.
- **Definition of done:** FR-14 met; estimate tests; a11y form.

### Story 3.3: Net-calorie & macro dashboard

As a user,
I want a clear daily summary of calories in vs. out and macros,
So that I can reflect and decide my next move.

**Acceptance Criteria:**

**Given** I have logged food and/or exercise today
**When** I open Home
**Then** I see calories consumed, daily target, remaining, protein/carbs/fat/fibre/sugar, water, exercise calories, and Net Calories with progress indicators (FR-15, UX-DR5)
**When** I save a food or exercise entry
**Then** the dashboard updates immediately
**Given** no goal is set
**Then** the dashboard still shows intake vs. burn meaningfully
**And** all copy is supportive and non-judgmental (UX-DR2).

- **Edge cases:** day boundary uses profile timezone (AD-10); empty state is encouraging, not blaming.
- **Dependencies:** 2.6, 3.1, 3.2.
- **Test scenarios:** live update; no-goal view; timezone day rollover; tone check.
- **Definition of done:** FR-15 met; component + integration tests; a11y; responsive (UX-DR1).

---

## Epic 4: Offline-Ready PWA

Deliver resilience: installable PWA with an instant offline logging path from cached foods, reconciled when back online. After this epic a user can log common meals on weak/no network.

### Story 4.1: Cached instant-path offline logging

As a user on a weak connection,
I want to log recent/known foods instantly without waiting for AI,
So that a bad signal never blocks my daily habit.

**Acceptance Criteria:**

**Given** I am on weak/no network
**When** I log a recently-used or cached DB food
**Then** it is recorded with no AI round-trip (FR-16, AD-12)
**And** the curated DB + recently-used foods are cached client-side for offline use.

- **Edge cases:** cache miss offline shows a clear "will parse when online" option; storage limits handled.
- **Dependencies:** 2.1, 2.6, 3.3.
- **Test scenarios:** offline log from cache; cache population; graceful cache miss.
- **Definition of done:** FR-16 (instant-path) met; offline tests; service worker cache.

### Story 4.2: Offline reconcile & PWA installability

As a user,
I want my offline logs to sync when I reconnect and to install the app,
So that nothing is lost or duplicated and the app feels native.

**Acceptance Criteria:**

**Given** I made offline entries
**When** the network returns
**Then** queued writes reconcile server-side via an idempotent upsert with a client-generated key — no loss, no duplicates (AD-12)
**Given** a supported browser
**When** I choose install
**Then** the PWA installs with manifest + icons and launches standalone (UX-DR1)
**And** queued smart-parse requests resume on reconnection.

- **Edge cases:** double-submit produces one record (idempotency); partial sync retries safely.
- **Dependencies:** 4.1.
- **Test scenarios:** reconcile no-dup; install flow; resume queued parses.
- **Definition of done:** FR-16 (reconcile) met; idempotency tests; installable PWA verified.
