---
title: FitMind AI
status: final
created: 2026-07-20
updated: 2026-07-20
---

# PRD: FitMind AI
*Working title — confirm.*

## 0. Document Purpose

This PRD is for the builder/PM and the downstream BMAD workflows (UX, architecture, epics/stories, QA). It builds on two upstream artifacts and does not duplicate them: the Product Brief (`_bmad-output/planning-artifacts/briefs/brief-FitMe_AI-2026-07-20/brief.md`) and the brainstorm intent (`_bmad-output/brainstorming/brainstorm-fitmind-ai-2026-07-20/brainstorm-intent.md`). It is Glossary-anchored: features are grouped with functional requirements (FRs) nested under them and numbered globally (FR-N) for stable downstream references. Assumptions are tagged inline as `[ASSUMPTION]` and indexed in §12. Technical/implementation choices are intentionally excluded here and belong in the architecture workflow.

## 1. Vision

FitMind AI is an accuracy-first personal calorie and nutrition tracker delivered as a responsive Progressive Web App. It exists for people who have quit every other tracker because logging their real food — especially composite Sri Lankan meals — felt impossible and the numbers felt invented. Its promise is effortless food input that produces precise, *sourced* nutrition data, balanced against calories burned so the user always knows where they stand.

The wedge is a disciplined pipeline: a curated nutrition database is the source of truth, and AI is the translator that parses natural language, decomposes a composite dish into ingredients and proportions, matches them to the database, and asks one tappable clarifying question only when a portion is genuinely uncertain. Unknown foods fall back to an AI estimate that is clearly labeled with a confidence level — never silent false precision.

If it earns trust, FitMind AI grows from an accurate tracker into a supportive personal health assistant (daily reflections, weekly reports, photo logging, richer health tracking). The through-line never changes: trustworthy numbers first, gentle guidance second, never guilt.

## 2. Target User

### 2.1 Jobs To Be Done

- **Functional:** "Log what I actually ate — local food included — in seconds, and see if I'm on track today (calories in vs. out)."
- **Emotional:** "Let me trust the numbers so I stop second-guessing and feel in control of my progress."
- **Emotional:** "Don't make me feel guilty; nudge me to make a better next choice."
- **Contextual:** "Work even when my phone signal is weak, one-handed, right after a meal."
- **Social (later):** "Eventually share progress with a coach or nutritionist." *(deferred)*

### 2.2 Non-Users (v1)

- Users who need multi-user/family accounts, or coach/nutritionist portal access — deferred.
- Users who require Sinhala or other non-English UI — English only in v1.
- Users seeking medical/clinical diagnosis or treatment — explicitly out; the app is not a medical device.

### 2.3 Key User Journeys

- **UJ-1. Nimali logs rice and curry in under 30 seconds.**
  - **Persona + context:** Nimali, 34, Colombo; quit three trackers because logging local food was impossible. Already authenticated on her phone.
  - **Entry state:** Authenticated PWA on Android/iPhone, on the Home dashboard, just finished dinner.
  - **Path:** Taps quick-add → types "rice and curry with pol sambol and dhal" → AI parses and decomposes → shows structured items with per-item sources → one clarifying chip appears: "Rice portion?" [small / medium / large] → she taps "medium" → reviews the totals.
  - **Climax:** She sees calories + macros with a visible source per value and taps Save; the Home dashboard's net-calorie ring updates instantly.
  - **Resolution:** Back on Home, she sees calories in vs. out and remaining — enough to decide her next choice. Realizes FR-6, FR-7, FR-8, FR-9, FR-19.
  - **Edge case:** Weak signal — the AI call is slow, so the app offers cached/recent foods for instant logging and queues the smart parse.

- **UJ-2. Nimali logs a food that isn't in the database.**
  - **Persona + context:** Same user, eats grandma's jackfruit curry.
  - **Entry state:** Authenticated, quick-add open.
  - **Path:** Types "jackfruit curry, one cup" → no DB match → AI produces an estimate → the entry is clearly badged "Estimated" with a confidence indicator → she can accept or edit the values.
  - **Climax:** She accepts; the estimate saves flagged as AI-estimated (auditable).
  - **Resolution:** Home updates; the item is distinguishable from DB-sourced items. Realizes FR-10, FR-11.

- **UJ-3. Nimali sets an aggressive goal and hits the safety ladder.**
  - **Persona + context:** Motivated, wants fast results.
  - **Entry state:** In Goals, editing her calorie target.
  - **Path:** Sets a target below the safe threshold → a warning appears. For a moderately unsafe target: yellow warning "not recommended," proceed allowed. For a dangerous target (already underweight / sub-~1000 kcal): a red warning requiring explicit consent/acknowledgement before saving.
  - **Climax:** She reads the red warning, acknowledges consent, and proceeds (or backs off).
  - **Resolution:** Target saved with the safety decision recorded. Realizes FR-4, FR-5.
  - **Edge case:** The app never recommends supplements/medication or diagnoses; it points to seeking professional advice where appropriate.

## 3. Glossary

- **User** — an individual account owner. v1 is single-user per account; one User owns all their data. No cross-user sharing.
- **User Profile** — the User's personal attributes (name, age, sex, height, current weight, activity level, dietary preferences, target weight, goal type, preferred units, country, timezone) used to derive targets.
- **Goal** — the User's chosen objective (weight loss / maintenance / muscle gain / general health) and the derived or overridden Targets.
- **Target** — a numeric daily/weekly objective (calories, protein, carbs, fat, fibre, water, steps, exercise minutes, weekly weight change).
- **Food** — a catalog entry (single food or composite dish) with per-serving nutrition. Sourced from the curated **Nutrition Database** or created as an AI-estimated entry.
- **Ingredient** — an atomic component with per-unit nutrition, used to compute composite dishes bottom-up.
- **Nutrition Database (curated)** — the trusted, citable source of truth for Ingredient and Food nutrition values.
- **Food Entry** — a logged consumption record: Food, quantity, unit, computed nutrition, meal type, datetime, data source, confidence level.
- **Data Source** — the provenance of a nutrition value: `database` (curated) or `ai_estimated`.
- **Confidence Level** — a qualitative/quantitative indicator attached to AI-estimated values.
- **Clarifying Chip** — a tappable multiple-choice prompt shown only for a genuinely uncertain attribute (typically portion/proportion).
- **Meal Type** — breakfast / lunch / dinner / snack.
- **Exercise Entry** — a logged activity: type, duration, intensity, and optional distance/sets/reps/weight, with estimated calories burned.
- **Baseline Burn** — the auto-estimated daily energy expenditure derived from the User Profile (BMR + activity level).
- **Net Calories** — calories in (Food Entries) minus calories out (Baseline Burn + Exercise Entries).
- **Dashboard** — the Home surface showing Net Calories and macro progress for a day.
- **Safety Ladder** — the graded response (green / yellow / red-with-consent) to unsafe Targets.
- **AI Interaction** — an auditable record of an AI request/response used for parsing or estimation.
- **User Correction** — an auditable record of a User editing an AI-produced value before or after save.

## 4. Features

### 4.1 Authentication & Account

**Description:** Secure email-based authentication with protected routes and session management. A User can register, verify, sign in, reset a password, and delete their account. All application data is isolated per User. Realizes the security foundation for every other feature. Uses Glossary terms exactly.

**Functional Requirements:**

#### FR-1: Email registration & sign-in
A prospective User can register with email + password and sign in to an authenticated session.
**Consequences (testable):**
- Passwords are stored only in hashed form; plaintext never persisted or logged.
- Invalid credentials return a generic error that does not reveal whether the email exists.
- A verified session is required to access any data route.

#### FR-2: Password reset
A User can request and complete a secure password reset via email.
**Consequences (testable):**
- Reset tokens are single-use and time-limited.
- Completing a reset invalidates prior sessions. [ASSUMPTION]

#### FR-3: Account deletion & data isolation
A User can permanently delete their account and associated personal data; every data query is scoped to the authenticated User.
**Consequences (testable):**
- After deletion, the User's health data is irrecoverable through the app. [ASSUMPTION: hard-delete vs. anonymize decided in architecture]
- A request for another User's record returns not-found/forbidden, never another User's data.

**Feature-specific NFRs:** Auth-related endpoints are rate-limited (see FR-30).

### 4.2 User Profile & Goals

**Description:** The first build move. A User creates a Profile; the system computes suggested Targets from standard formulas (BMR/TDEE) and lets the User override them. Every calculation shows its formula, inputs, and limitations. Unsafe Targets trigger the Safety Ladder. Realizes UJ-3.

**Functional Requirements:**

#### FR-4: Create/edit User Profile & compute Targets
A User can create and edit their Profile; the system derives suggested Targets (daily calories, protein, carbs, fat, fibre, water, steps, exercise minutes, weekly weight-change) and lets the User override each.
**Consequences (testable):**
- Baseline Burn and calorie Target are derived from Profile via a documented formula (e.g., Mifflin-St Jeor) [ASSUMPTION: exact formula chosen in architecture]; the formula, inputs, and a "these are estimates, not medical advice" limitation are visible.
- Changing Profile inputs (weight, activity level) recomputes suggested Targets.
- Preferred units (metric/imperial) apply consistently across inputs and displays.

#### FR-5: Safety Ladder on Targets
When a User sets a Target the system flags as unsafe, the system responds on a graded ladder.
**Consequences (testable):**
- Moderately unsafe target → yellow warning labeled "not recommended"; the User may proceed without a hard block.
- Dangerous target (e.g., already-underweight BMI, or calories below a safe floor ~1000 kcal [ASSUMPTION: exact thresholds set with a documented source]) → red warning requiring explicit consent/acknowledgement before saving.
- The system never recommends supplements, medication, or diagnoses; where appropriate it advises consulting a professional.
- The safety decision (warning shown, consent given) is recorded.

### 4.3 Food Logging (Core Pipeline)

**Description:** The beating heart. A User logs food via natural language; AI parses the text, decomposes composite dishes into Ingredients and proportions, matches them to the curated Nutrition Database, and shows structured Food Entries with a per-value Data Source. A Clarifying Chip appears only for genuinely uncertain attributes. The User reviews/edits before saving. Unknown foods fall back to a clearly labeled AI estimate with a Confidence Level. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-6: Natural-language food parsing
A User can enter free text (e.g., "two eggs, one milk tea, 100g chickpeas, one dhal wade") and receive structured, editable Food Entries.
**Consequences (testable):**
- Output is schema-validated structured data (name, quantity, unit, calories, protein, carbs, fat, fibre, sugar, sodium, meal type, datetime, data source, confidence). [ASSUMPTION: full macro set required at parse time; missing values marked, not fabricated]
- Each parsed item carries a Data Source (`database` or `ai_estimated`).
- Parsing failures degrade gracefully to manual entry, never a dead end.

#### FR-7: Composite-dish decomposition & bottom-up calculation
For a composite dish, the system decomposes it into Ingredients with proportions and computes nutrition bottom-up from Ingredient values.
**Consequences (testable):**
- A composite Food Entry's totals equal the sum of its Ingredient contributions (within rounding).
- The Ingredient breakdown is viewable by the User.

#### FR-8: Clarifying Chips for uncertain attributes
When an attribute (typically portion/proportion) is genuinely uncertain, the system presents a small number of tappable Clarifying Chips rather than a free-form form.
**Consequences (testable):**
- Chips appear only when confidence is below a threshold; a confident parse shows none.
- Selecting a chip updates the computed nutrition immediately.
- The number of chips per log is bounded to protect the sub-30-second goal (SM-1). [ASSUMPTION: cap ~1–3]

#### FR-9: Review & edit before save
A User can review and correct any AI-produced value (food identity, quantity, unit, macros) before saving a Food Entry.
**Consequences (testable):**
- No AI-produced Food Entry is persisted without passing through a confirm/edit step.
- Edits are captured as a User Correction (see FR-27) and override the AI value.

#### FR-10: Source citation & transparency
Each nutrition value displays its Data Source; AI-estimated values are visibly badged with a Confidence Level.
**Consequences (testable):**
- `database` values show the source; `ai_estimated` values show an "Estimated" badge + confidence and are visually distinguishable.
- During processing, a loading state shows progress and a helpful hint/tip.

#### FR-11: AI-estimated fallback for unknown foods
When no Nutrition Database match exists, the system produces an AI estimate clearly labeled as estimated with a Confidence Level, editable by the User.
**Consequences (testable):**
- The resulting Food Entry has Data Source `ai_estimated`.
- Estimated values are never presented as database-sourced or medically exact.

#### FR-12: Set meal type, quantity, unit, datetime
A User can set/adjust meal type, quantity, unit, and date/time for any Food Entry, defaulting to sensible values (now, inferred meal type).
**Consequences (testable):**
- Datetime respects the User's Profile timezone; a log made at 00:30 lands on the correct local day.

### 4.4 Exercise & Calorie Burn

**Description:** Calories out has two parts. Baseline Burn is auto-estimated from the Profile so Net Calories works even with zero exercise logged; specific workouts are entered manually on top. Estimated burn is never presented as exact. 

**Functional Requirements:**

#### FR-13: Auto baseline burn
The system computes and displays Baseline Burn from the User Profile, with the formula and its limitations shown.
**Consequences (testable):**
- Net Calories is computable with no Exercise Entries present.
- Baseline recomputes when relevant Profile values change.

#### FR-14: Manual exercise logging
A User can log an Exercise Entry (type, duration, intensity; optional distance/sets/reps/weight/notes) and receive an estimated calories-burned value, plus custom exercise types.
**Consequences (testable):**
- Estimated calories burned is labeled as an estimate, not exact.
- Supported types include walking, running, treadmill, cycling, strength, swimming, sports, and custom.

### 4.5 Daily Nutrition Dashboard

**Description:** The retention engine. A clean Home Dashboard shows Net Calories (in vs. out), remaining calories, and macro/water progress with simple indicators — a nudge, not a nag. It works with or without a set Goal and makes the User reflect and decide their next move.

**Functional Requirements:**

#### FR-15: Net-calorie & macro dashboard
The Dashboard shows, for the current day: calories consumed, daily calorie Target, remaining, protein/carbs/fat/fibre/sugar, water, exercise calories, and Net Calories, with progress indicators.
**Consequences (testable):**
- Values update immediately after a Food or Exercise Entry is saved.
- With no Goal set, the Dashboard still shows intake vs. burn meaningfully.
- Copy is supportive and non-judgmental (no guilt language).

### 4.6 Offline & Speed Resilience

**Description:** Common logs stay instant on weak/no network. The AI smart-path is the default when connected; a cached instant-path (curated DB + recently-used/saved foods) is the graceful fallback. The curated database doubles as the offline cache.

**Functional Requirements:**

#### FR-16: Cached instant-path fallback
When the network is weak/unavailable, the system lets the User log from cached DB entries and recently-used foods without an AI round-trip, and reconciles when back online.
**Consequences (testable):**
- A recently-used/cached food can be logged with no network.
- Queued smart-parse requests resume/reconcile on reconnection. [ASSUMPTION: reconciliation model detailed in architecture]

### 4.7 AI Safety & Behaviour Guardrails

**Description:** Cross-feature AI behaviour rules that keep the assistant safe and honest. These constrain FR-4/5/6/11 and any future AI feature.

**Functional Requirements:**

#### FR-17: No medical advice / safe-language guardrails
AI-generated text must not diagnose conditions, recommend medication/supplements, or use guilt-based language; it recommends professional advice where appropriate.
**Consequences (testable):**
- AI outputs pass a guardrail check before display; violations are blocked/regenerated. [ASSUMPTION: guardrail mechanism defined in architecture]
- Estimated values are always marked; the AI never invents precise values presented as known.

#### FR-18: Structured, schema-validated AI outputs
All AI outputs consumed by the system are validated against a schema before use; invalid outputs fail safe.
**Consequences (testable):**
- A response failing schema validation does not produce a saved Food Entry; the User is prompted to retry or enter manually.

### 4.8 Auditability & AI Provenance

**Description:** Because the app leans on AI estimation, every AI-produced value and every human correction is auditable, supporting trust and future learning.

**Functional Requirements:**

#### FR-19: AI Interaction logging
The system records each AI Interaction (request context, model/provider-agnostic reference, response, confidence) tied to the resulting entry.
**Consequences (testable):**
- Every `ai_estimated` Food Entry links to an AI Interaction record.
- No sensitive health data appears in application logs or error messages (see FR-31).

#### FR-20: User Correction capture
The system records User Corrections to AI-produced values.
**Consequences (testable):**
- A correction stores before/after values and timestamp, tied to the User and entry.
- [ASSUMPTION] Corrections are captured in v1 to enable future learning; automated learning itself is deferred.

## 5. Non-Goals (Explicit)

- FitMind AI is **not a medical device** and does not diagnose, treat, or prescribe.
- Not a social network: no cross-user sharing, feeds, or comparison in v1.
- Not a coach/nutritionist platform in v1 (no professional portal).
- Not multilingual in v1 (English only; Sinhala deferred).
- Not a meal-planning / grocery / recipe-costing tool in v1.
- Does not integrate wearables or external health platforms in v1.
- Does not perform photo or barcode or voice logging in v1.

## 6. MVP Scope

### 6.1 In Scope

- Email auth, protected routes, per-user data isolation, password reset, account deletion (FR-1–3)
- User Profile + Target computation with visible formulas + Safety Ladder (FR-4–5)
- Natural-language food logging: parse → decompose → DB match → clarifying chips → review/edit → save (FR-6–9, FR-12)
- Source citation, AI-estimated fallback with confidence (FR-10–11)
- Auto Baseline Burn + manual exercise logging (FR-13–14)
- Net-calorie Dashboard (FR-15)
- Cached instant-path offline fallback (FR-16)
- AI safety guardrails + schema-validated outputs (FR-17–18)
- AI Interaction + User Correction auditability (FR-19–20)
- Curated Sri Lankan Nutrition Database with seed data (see Constraints)
- Responsive PWA (Android tablet, iPhone, laptop)

### 6.2 Out of Scope for MVP

- Body/weight progress + trend charts — *Should, Phase 2.* `[NOTE FOR PM]` emotionally load-bearing for motivation; revisit if timeline allows.
- Daily health check-in (sleep/mood/water/steps beyond dashboard water) — *Should, Phase 2.*
- AI daily reflection — *Should, Phase 3.*
- Weekly report — *Should, Phase 3.*
- Photo food recognition — *Should, Phase 3.*
- Barcode scanning, voice logging, meal planning/grocery/recipe nutrition — *Could, later.*
- Heavy manual food-search / saved-meals / custom-foods UI — *Won't this time* (the lightweight review/confirm step is kept).
- Wearables, coach/nutritionist portal, multilingual/Sinhala, gamification, multi-user/family — *Won't this time.*

## 7. Success Metrics

**Primary**
- **SM-1**: Time-to-log a common meal — median under 30 seconds, one-handed. Validates FR-6, FR-8, FR-9, FR-16.
- **SM-2**: Two-week retention — a single user sustains daily logging across the first 14 days without abandonment. Validates FR-15, FR-10. [ASSUMPTION: target]

**Secondary**
- **SM-3**: Trust proxy — share of Food Entries the User accepts without heavy correction (an over-correction rate would signal poor accuracy). Validates FR-6, FR-7, FR-10.
- **SM-4**: Offline success — logs completed on weak/no network via the instant-path. Validates FR-16.

**Counter-metrics (do not optimize)**
- **SM-C1**: Do not optimize SM-1 (speed) by removing the review/confirm step or suppressing needed Clarifying Chips — accuracy and trust must not regress. Counterbalances SM-1.
- **SM-C2**: Do not optimize retention via guilt/streak pressure or nagging notifications — tone must stay supportive. Counterbalances SM-2.

## 8. Constraints and Guardrails

### 8.1 Safety
- No medical advice, diagnosis, or medication/supplement recommendations (FR-17).
- Safety Ladder enforced on unsafe Targets (FR-5); dangerous cases require explicit consent.
- All estimates labeled; never presented as medically exact.

### 8.2 Privacy
- Health and body data is sensitive: encryption in transit; secure secret management; minimal data collection; consent controls; clear privacy settings.
- Per-user data isolation and authorization checks on every data access.
- Data export and account deletion supported (export UI [ASSUMPTION: export is a control requirement; full export screen may phase in]).
- No private health data in logs or error messages.

### 8.3 Cost
- AI usage is a recurring cost driver; the instant-path/caching and bounded clarifying chips also protect cost, not just speed. [ASSUMPTION: budget ceiling undefined — flag for architecture.]

## 9. Cross-Cutting NFRs

- **Performance:** Dashboard interactions feel instant; smart-path parse target [ASSUMPTION: p95 < ~4s connected]; instant-path logging works offline.
- **Security:** Input validation on all inputs; rate limiting (FR-30 below); secure file uploads when introduced; protection against common web vulnerabilities (OWASP Top 10).
- **Accessibility:** WCAG 2.1 AA target; usable one-handed on a phone; sufficient contrast and touch targets.
- **Responsive:** Correct layout across Android tablet, iPhone, laptop; mobile-first.
- **Reliability/Observability:** Audit logging for important operations; errors never leak health data.
- **AI provider independence:** A provider-agnostic AI service layer; the app is not coupled to one provider.

*(FR-30 rate limiting and FR-31 no-sensitive-data-in-logs are cross-cutting requirements referenced above; they are enforced across features rather than owned by one.)*

- **FR-30: Rate limiting** — auth and AI endpoints are rate-limited per user/IP. Testable: excess requests are throttled with a safe error.
- **FR-31: No sensitive data in logs** — logs and error messages exclude health/body/PII values. Testable: log inspection on representative flows shows no such values.

## 10. Platform & Information Architecture

- **Platform:** Responsive PWA (installable), targeting modern mobile and desktop browsers; offline-capable for the instant-path.
- **Top-level surfaces (v1):** Onboarding/Profile setup, Home Dashboard, Quick Food Entry, Food-Entry Review, Exercise Entry, Goals, Settings (units, privacy, consent, account deletion, data export).
- **Deferred surfaces:** Body measurements, Daily reflection, Weekly report, Saved meals, Progress dashboard.

## 11. Aesthetic and Tone

- **Voice:** supportive, non-judgmental, plain-language; explains recommendations simply; no guilt or shaming.
- **Feel:** fast, friendly, motivating; a nudge that makes the user think, never a nag.
- **Visual:** clean, mobile-first, clear progress indicators; trust cues (sources, confidence badges) are first-class UI, not fine print.
- **Anti-references:** cluttered forms, dense manual search, alarmist red-everywhere, streak-guilt mechanics.

## 12. Assumptions Index

- §4.1 FR-2 — Completing a reset invalidates prior sessions.
- §4.1 FR-3 — Hard-delete vs. anonymize on account deletion (decide in architecture).
- §4.2 FR-4 — Exact BMR/TDEE formula (e.g., Mifflin-St Jeor) chosen in architecture.
- §4.2 FR-5 — Exact unsafe/dangerous thresholds set with a documented source.
- §4.3 FR-6 — Full macro set required at parse time; missing values marked, not fabricated.
- §4.3 FR-8 — Clarifying chip cap (~1–3) per log.
- §4.6 FR-16 — Offline reconciliation model detailed in architecture.
- §4.7 FR-17/18 — Guardrail + schema-validation mechanism defined in architecture.
- §4.8 FR-20 — Corrections captured in v1; automated learning deferred.
- §7 SM-2 — Two-week retention target.
- §8.3 — AI cost budget ceiling undefined.
- §9 — Performance p95 targets provisional.
- §8.2 — Data export may phase in as a control vs. full screen.

## 13. Open Questions

1. ~~What curated nutrition data source(s)...~~ **RESOLVED:** Hybrid — seed ingredient-level data from a public open dataset (e.g., USDA FoodData Central, subject to license check) + a hand-curated Sri Lankan dish/ingredient seed set; AI-estimated entries fill gaps and are labeled. (Architecture to confirm dataset + licensing.)
2. ~~What are the exact safety thresholds...~~ **RESOLVED:** Use widely-cited public-health defaults (calorie floor ~1200 kcal/day women, ~1500 kcal/day men; max ~1% bodyweight/week) with the source cited in-app. Exact figures confirmed against a citable source in architecture/research.
3. Which BMR/TDEE and exercise-calorie formulas, and are they shown to the user verbatim?
4. AI provider(s) for v1 behind the provider-agnostic layer, and cost/latency budget?
5. Account-deletion policy: hard-delete vs. anonymized retention (and any audit retention obligations)?
6. Is a full data-export screen in MVP, or just the deletion + consent controls?
