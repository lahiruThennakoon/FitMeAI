# FitMe AI — Implemented Features & AI Integration

This document describes what is built in the FitMe AI MVP, how work is grouped by product phase (epic), where AI is used, and how an AI call flows through the code from the UI to the provider and back.

**Scope:** `fitme-ai/` application (Next.js 16, PostgreSQL, Better Auth, Prisma).

---

## Summary

| Area | Uses AI? | Notes |
|------|----------|-------|
| Natural-language meal parsing | **Yes** | Only production LLM feature; **free-tier daily quota** (Epic 11.1) |
| Freemium / subscriptions | No | Entitlements + quota gate; payment providers deferred (Epic 11.3+) |
| Meal review, save, edit, favorites | No | Deterministic; may consume AI parse output |
| Auth, profile, targets | No | Better Auth + formulas |
| Dashboard, water, day switcher | No | Aggregations + domain math |
| Exercise logging | No | MET × weight formulas |
| Fasting timer | No | Timestamps + UI |
| Glucose logging | No | User-entered values |
| Progress charts | No | Metric series from DB |
| Offline quick log | No | Cached catalog; smart parse queued for reconnect |

**Design rule:** AI proposes structured drafts; the user confirms before anything is saved. The nutrition catalog database wins over AI estimates when a food matches.

---

## Implementation phases (epics)

Features are delivered in epics aligned with functional requirements (FR) from the PRD.

| Epic | Phase | Status | Primary features | AI role |
|------|-------|--------|------------------|---------|
| **1** | Secure account & setup | Done | Register, login, password reset, account deletion, profile, BMR/TDEE targets, safety ladder | None |
| **2** | Food logging | Done | NL parse, review UI, clarifying chips, source badges, catalog match, AI fallback estimates, guardrails, audit | **Core AI epic** |
| **3** | Activity & dashboard | Done | Baseline burn, exercise log, net calories, macro dashboard | None |
| **4** | Offline PWA | Done | Service worker, offline catalog, instant quick log, reconcile queue, install banner + PNG icons | Queues smart parse offline; AI runs on reconnect |
| **5** | Daily habit loop | Done | Water log, edit/delete meals & exercise, day switcher, recent/favorites | None |
| **6** | Body progress | In progress | Weight check-in, pacing feedback; trend via Epic 9 | None |
| **7** | Fasting tracker | Done | Start/stop fast, timer, history, home chip | None |
| **8** | Blood sugar | Done | Glucose log, list edit/delete, home glance | None |
| **9** | Correlation graphs | Done | `/progress` charts, metric picker, time ranges | None |
| **10** | Appearance | In progress | Light/dark/system theme, profile sync | None |
| **11** | Commercial & freemium | In progress | AI parse daily quota, `Subscription` model, entitlements DAL | Quota gate before parse; metering from audit rows |

Planning references: `_bmad-output/planning-artifacts/epics.md`, per-epic files under `_bmad-output/planning-artifacts/`.

---

## Feature catalog

### Epic 1 — Account & profile (no AI)

| Feature | Route / entry | Implementation |
|---------|---------------|----------------|
| Registration | `/register` | `register-form.tsx` → `registerAction()` → Better Auth |
| Sign-in | `/login` | `login-form.tsx` → `loginAction()` |
| Password reset | `/forgot-password`, `/reset-password` | Server actions in `app/actions/auth.ts` |
| Account deletion | `/settings` | `deleteAccountAction()` — password + `DELETE` confirm |
| Profile & targets | `/goals` | `saveProfileAction()`, Mifflin–St Jeor in `lib/domain/targets/bmr.ts` |
| Safety ladder | `/goals` | `lib/domain/safety/ladder.ts` — green/yellow/red targets |
| Session guard | App routes | `app/(app)/layout.tsx` — redirects to `/login` if no session |
| Bottom quick nav | All app routes | `AppQuickNav` — fixed bottom tab bar: Home (`/dashboard`), Log (`/log`), Exercise (`/exercise`), More (fasting, glucose, progress, goals, settings). Active tab: filled pill + brand icon fill; `env(safe-area-inset-bottom)` on PWA standalone |
| Log save toast | Authenticated app | `LogToastProvider` + `useLogToast()` — snackbar above bottom nav confirms successful saves (water, food, exercise, glucose, weight, fasting) and soft-delete undo actions |

**Validation:** Shared email normalization in `lib/domain/auth/email.ts`; Zod schemas in `lib/schemas/auth.ts`; client + server validation on login/register forms.

---

### Epic 2 — Food logging (AI-powered parse)

| Feature | Route | AI? | Implementation |
|---------|-------|-----|----------------|
| Natural-language parse | `/log` | **Yes** | `parseMealAction()` |
| Review & edit draft | `/log` | No | `LogMealForm` state + `saveMealDraftAction()` |
| Clarifying chips | `/log` | No | Rule-based when confidence &lt; 0.7 — `clarifying-chips.ts` |
| Catalog vs estimated badge | `/log` | No | `source-citation.ts`, `source-badge.tsx` |
| Composite dish breakdown | `/log` | No | `decompose.ts` — deterministic from catalog |
| Rematch food name | `/log` | No | `rematchFoodDraftAction()` — DB lookup only |
| Save confirmed meal | `/log` | No | `saveConfirmedFoodEntries()` in `lib/dal/food-entry.ts` |
| User corrections audit | On save | No | `diffAiCorrections()` when user edits AI draft |

---

### Epic 3 — Activity & dashboard (no AI)

| Feature | Route | Implementation |
|---------|-------|----------------|
| Home dashboard | `/dashboard` | `page.tsx` + `DailySummaryPanel` |
| Baseline burn | Dashboard | `computeBaselineBurn()` — `lib/domain/burn/baseline.ts` |
| Net energy vs food budget | Dashboard | `buildDailySummary()`, `describeEnergyBalance()` |
| Exercise logging | `/exercise` | MET estimate — `lib/domain/burn/exercise-estimate.ts` |
| Today's meals / exercise lists | Dashboard | `TodayMealsList`, `TodayExercisesList` |

---

### Epic 4 — Offline (AI deferred, not skipped)

| Feature | Behavior |
|---------|----------|
| Offline detection | `isBrowserOffline()` in `lib/offline/browser-store.ts` |
| Smart parse while offline | Text queued as `smart_parse`; **no LLM call until online** |
| Instant quick log | Cached catalog foods — no AI |
| Reconcile on reconnect | `reconcileOfflineQueueAction()` |

When the user taps **Parse meal** offline, the form queues the description instead of calling `parseMealAction()`:

```typescript
// app/(app)/log/log-meal-form.tsx (simplified)
if (isBrowserOffline()) {
  appendParseQueue({ kind: "smart_parse", text, ... });
  setFormError("You're offline — we'll parse this when you're back online.");
  return;
}
const result = await parseMealAction({ text });
```

---

### Epic 5 — Daily habit loop (no AI)

| Feature | Implementation |
|---------|----------------|
| Water quick-add | `WaterLogControl` → `saveWaterEntryAction()` |
| Edit/delete food | `updateFoodEntryAction`, `deleteFoodEntryAction` |
| Edit/delete exercise | `app/actions/exercise.ts` |
| Day switcher | `DaySwitcher` + `?day=YYYY-MM-DD` — `lib/domain/dashboard/day-bounds.ts` |
| Recent & favorites | `food-template.ts` — copies saved macros, no re-parse |

---

### Epics 6–9 (no AI)

| Epic | Features |
|------|----------|
| **6** | Weight check-in on `/goals`, pacing copy (`lib/domain/weight/pacing.ts`) |
| **7** | Fasting timer `/fasting`, history, `FastingStatusChip` on dashboard |
| **8** | Glucose log `/glucose`, unit conversion, home `GlucoseGlance` |
| **9** | Progress page `/progress`, metric series DAL, chart renderer |
| **11** | Freemium entitlements, AI parse quota on `/log`, `Subscription` schema (Story 11.1) |

---

### Epic 11 — Commercial & freemium (partial — Story 11.1)

| Feature | Route / entry | AI? | Implementation |
|---------|---------------|-----|----------------|
| Daily AI parse quota (free tier) | `/log` Parse meal | Gate only | `assertAiParseAllowed()` in `lib/dal/entitlements.ts`; called from `parseMealAction` |
| Pro unlimited parses | `/log` | — | `Subscription` row with effective `plan: pro` |
| Entitlements read | `/log` page | No | `getEntitlements()` — remaining parses hint for free users |
| Beta kill-switch | env | No | `BILLING_ENABLED=false` skips quota for all users |

**Not gated (free tier):** catalog quick-log (`saveInstantFoodAction`), manual entry, favorites/recent catalog paths, offline instant-path.

**Metering:** Counts `AIInteraction` rows where `purpose = "food_parse"` and `status = "succeeded"` within the profile-timezone calendar day (AD-10). Failed parses do not consume quota.

**Env:** `FREE_AI_PARSES_PER_DAY` (default `5`), `BILLING_ENABLED` (default on; set `false` for closed beta).

**Deferred (Epic 11.2–11.6):** Stripe/PayHere checkout, `/settings/billing` UI, progress/fasting/glucose depth gates, offline smart-parse reconcile quota.

See: `_bmad-output/implementation-artifacts/11-1-freemium-ai-parse-quota.md`, `epic-11-commercial-freemium.md`.

---

## AI architecture

### Layer diagram

```text
┌─────────────────────────────────────────────────────────────┐
│  UI: LogMealForm (/log)                                     │
└───────────────────────────┬─────────────────────────────────┘
                            │ parseMealAction({ text })
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Server action: app/actions/log.ts                          │
│  • Session + assertAiParseAllowed (free daily quota)        │
│  • Abuse rate limit (30/hr)                                 │
│  • Zod input validation                                     │
│  • createAiProvider()                                       │
└───────────────────────────┬─────────────────────────────────┘
                            │ generateStructured(...)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  GuardedAiProvider (lib/ai/guarded-provider.ts)             │
│  • Safety system prompt                                     │
│  • Output guardrails + up to 2 attempts                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
     GeminiAiProvider              OpenAiProvider
     (REST generateContent)         (chat/completions JSON)
              │                           │
              └─────────────┬─────────────┘
                            │ raw JSON text
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  parseAndValidate() + foodParseAiSchema (Zod)             │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  resolveParsedMeal() — catalog lookup, estimates, chips     │
│  recordAiInteraction() — audit row (no prompt text stored)  │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Review UI → saveMealDraftAction({ confirmed: true, ... })  │
└─────────────────────────────────────────────────────────────┘
```

### Provider port

All LLM access goes through a single interface (`lib/ai/types.ts`):

```typescript
interface AiProvider {
  readonly id: string;
  generateStructured<T>(
    input: GenerateStructuredInput,
    schema: z.ZodType<T>,
    options?: GenerateStructuredOptions,
  ): Promise<AiResult<T>>;
}
```

Swapping providers is configuration-only — no call-site code changes.

### Configuration (`lib/ai/config.ts`)

| Environment variable | Purpose | Default |
|---------------------|---------|---------|
| `AI_PROVIDER` | `gemini` \| `openai` \| `fake` | `gemini` |
| `GEMINI_API_KEY` | Google AI Studio key | — |
| `OPENAI_API_KEY` | OpenAI key | — |
| `AI_MODEL` | Model override | `gemini-2.0-flash` or `gpt-4o-mini` |
| `AI_TIMEOUT_MS` | HTTP timeout | `20000` |

Factory wraps every adapter in guardrails:

```typescript
// lib/ai/config.ts
export function createAiProvider(env = process.env): AiProvider {
  const cfg = readAiRuntimeConfig(env);
  if (cfg.provider === "openai") {
    return new GuardedAiProvider(new OpenAiProvider({ ... }));
  }
  if (cfg.provider === "fake") {
    return new GuardedAiProvider(new FakeAiProvider(...)); // tests
  }
  return new GuardedAiProvider(new GeminiAiProvider({ ... }));
}
```

Diagnostic script: `npm run` / `node scripts/check-ai.mjs`.

---

## How an AI call is made (step by step)

### Step 1 — User triggers parse in the browser

File: `app/(app)/log/log-meal-form.tsx`

The user enters a meal description and submits. If online, the client calls the server action:

```typescript
const result = await parseMealAction({ text });
if (result.ok) {
  setItems(result.data.items);
  setAiInteractionId(result.data.aiInteractionId);
}
```

The form uses `noValidate` and server-side Zod for the parse input; AI is never invoked from the browser directly (no API keys in the client).

---

### Step 2 — Server action: auth, entitlements, rate limit, validation

File: `app/actions/log.ts` — `parseMealAction()`

1. **`requireSession()`** — must be signed in.
2. **`assertAiParseAllowed(userId)`** — free-tier daily quota (`lib/dal/entitlements.ts`); Pro users skip; returns `{ ok: false, fieldErrors: { code: "ai_quota_exceeded" } }` when exhausted — **no AI call**.
3. **`enforceAiRateLimit("foodParse", clientKey)`** — 30 requests/hour per client key (`lib/rate-limit/`) — abuse backstop, separate from daily quota.
4. **`parseMealInputSchema.safeParse(input)`** — validates `{ text }` length and shape.
5. **`createAiProvider()`** — returns guarded Gemini, OpenAI, or fake adapter.

---

### Step 3 — Structured generation request

Still in `parseMealAction()`:

```typescript
const aiResult = await provider.generateStructured(
  {
    purpose: "food_parse",
    systemInstruction: FOOD_PARSE_SYSTEM,
    userPrompt: text,
    responseSchema: { ...foodParseResponseSchema },
  },
  foodParseAiSchema,
);
```

- **`FOOD_PARSE_SYSTEM`** — instructions in `lib/ai/schemas/food-parse.ts` (food names, quantities, units, confidence, optional macro estimates).
- **`foodParseAiSchema`** — Zod schema that is the **authority** on valid output (items array, per-item macros, meal types).
- **`foodParseResponseSchema`** — JSON schema hint for Gemini; OpenAI uses JSON mode similarly.

Expected AI output shape (simplified):

```typescript
{
  items: [{
    name: string,
    quantity: number,
    unit: "g" | "piece" | "cup" | ...,
    mealType?: "breakfast" | "lunch" | ...,
    confidence: 0..1,
    needsClarification?: boolean,
    estimate?: { energyKcal, proteinG, ... }  // only if unknown food
  }],
  inferredMealType?: ...
}
```

---

### Step 4 — Guardrails wrapper

File: `lib/ai/guarded-provider.ts`

Before and after each provider call:

1. Prepends **`SAFETY_SYSTEM_INSTRUCTION`** (no medical advice, no shaming — FR-17).
2. Calls inner provider.
3. Runs **`checkAiOutput(rawText, data)`** on `lib/ai/guardrails.ts` — regex and field scans.
4. On failure, retries once with **`GUARDRAIL_REGEN_HINT`**.
5. After max attempts → `{ ok: false, code: "guardrail_blocked" }`.

The user sees a safe manual-entry fallback, not raw model text.

---

### Step 5 — Provider HTTP call (Gemini example)

File: `lib/ai/gemini.ts`

```typescript
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const body = {
  contents: [{ role: "user", parts: [{ text: input.userPrompt }] }],
  systemInstruction: { parts: [{ text: systemBits }] },
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: input.responseSchema,
  },
};

const res = await fetch(url, {
  method: "POST",
  headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
  body: JSON.stringify(body),
  signal, // timeout via AbortController
});
```

OpenAI adapter (`lib/ai/openai.ts`) uses `POST https://api.openai.com/v1/chat/completions` with `response_format: { type: "json_object" }`.

Both adapters pass response text to **`parseAndValidate()`** (`lib/ai/parse.ts`), which strips markdown fences, parses JSON, and runs Zod.

---

### Step 6 — Post-AI resolution (no second LLM call)

File: `lib/domain/nutrition/resolve-parse.ts` — `resolveParsedMeal()`

For each AI item:

1. **`lookupFoodByName()`** — query nutrition catalog (slug, alias, fuzzy name).
2. If **match** → **`buildCatalogDraft()`** — scale catalog nutrition to portion; `dataSource: "database"`.
3. If **no match** → **`buildEstimatedDraft()`** — use AI `estimate` macros; `dataSource: "ai_estimated"`.
4. Low confidence → flag for **clarifying chips** (deterministic rules, not LLM).

Catalog always wins over AI numbers when a food is found (AD-3).

---

### Step 7 — Audit & provenance

File: `lib/dal/ai-interaction.ts` — `recordAiInteraction()`

On success or failure, an **`AIInteraction`** row is stored with:

- Provider id, model, purpose, status, error code
- **`requestMeta`** — `{ purpose, promptCharLength }` only — **never the meal text**
- **`responseSummary`** — item count, names, confidence stats

When the user saves, `FoodEntry.aiInteractionId` links back to this row. Edits vs the AI draft create **`UserCorrection`** rows via `diffAiCorrections()`.

---

### Step 8 — User confirms and saves (no AI)

File: `app/actions/log.ts` — `saveMealDraftAction()`

Requires `confirmed: true`. Persists via `saveConfirmedFoodEntries()` only after explicit user action. Rematch and manual edits use catalog lookup, not the LLM.

---

## AI-related files reference

| Path | Role |
|------|------|
| `lib/ai/types.ts` | `AiProvider` port, result types, safe error messages |
| `lib/ai/config.ts` | Env config, `createAiProvider()` |
| `lib/ai/guarded-provider.ts` | Safety wrapper, retry on guardrail hit |
| `lib/ai/guardrails.ts` | FR-17 pattern checks |
| `lib/ai/parse.ts` | JSON extract + Zod validate |
| `lib/ai/audit.ts` | Redacted request/response metadata |
| `lib/ai/gemini.ts` | Gemini REST adapter |
| `lib/ai/openai.ts` | OpenAI chat adapter |
| `lib/ai/fake.ts` | Test/offline fake provider |
| `lib/ai/schemas/food-parse.ts` | System prompt + Zod output schema |
| `app/actions/log.ts` | `parseMealAction`, save, rematch |
| `lib/domain/nutrition/resolve-parse.ts` | Catalog merge after parse |
| `lib/domain/nutrition/estimate-fallback.ts` | AI estimate → draft |
| `lib/domain/nutrition/clarifying-chips.ts` | Portion clarification UI logic |
| `lib/domain/nutrition/corrections.ts` | User vs AI diff |
| `lib/dal/ai-interaction.ts` | Persist audit rows; **quota metering source** (Story 11.1) |
| `lib/dal/entitlements.ts` | `getEntitlements`, `assertAiParseAllowed` (Story 11.1) |
| `lib/domain/billing/entitlements.ts` | Pure plan resolution + quota math |
| `lib/billing/config.ts` | `BILLING_ENABLED`, `FREE_AI_PARSES_PER_DAY` |

---

## Architecture invariants (AI)

From the Architecture Spine and Epic 2 stories:

1. **AI never persists directly** — user must confirm on the review screen.
2. **Catalog DB beats AI** — matched foods use database nutrition, not model guesses.
3. **Every stored value has provenance** — `dataSource` + `confidence` on food entries.
4. **Prompts are not logged or stored** — only length and safe summaries in audit.
5. **Provider swap = env change** — `AI_PROVIDER` + keys; port stays stable.
6. **Outputs are schema-validated** — Zod is authoritative; model JSON is untrusted input.
7. **Guardrails before display** — unsafe text is blocked or regenerated, then fails safe.
8. **Free-tier parse quota is server-enforced** — UI hints only; metering uses audit rows, not client state (Story 11.1).

---

## Automated tests (AI)

| Test file | Covers |
|-----------|--------|
| `tests/ai-provider.test.ts` | Provider adapters, timeout, not_configured |
| `tests/ai-guardrails.test.ts` | Medical advice / shaming blocks |
| `tests/ai-audit.test.ts` | No forbidden fields in audit meta |
| `tests/ai-parse.test.ts` | JSON extraction + Zod |
| `tests/parse-meal-action.test.ts` | End-to-end action with fake provider + quota gate |
| `tests/entitlements.test.ts` | Plan resolution + quota math (Story 11.1) |
| `tests/entitlements-dal.test.ts` | DAL entitlement checks (Story 11.1) |
| `tests/food-parse-resolve.test.ts` | Catalog vs estimate resolution |

Run: `npm test` from `fitme-ai/`.

---

## What is intentionally not AI

These features use formulas, database queries, or user input only:

- BMR / TDEE / baseline burn / net calories
- Exercise calorie estimates (MET tables)
- Macro targets and safety ladder
- Water, weight, glucose, fasting timers
- Progress charts and correlations
- Authentication and email validation
- Offline catalog quick log

Keeping AI scoped to **natural-language meal parsing** reduces cost, latency, and safety surface while preserving a clear user trust model: AI suggests, the app and catalog decide what gets stored.

---

*Last updated: 2026-07-31 — reflects Epics 1–11 (Story 11.1 freemium quota) in `fitme-ai/`.*
