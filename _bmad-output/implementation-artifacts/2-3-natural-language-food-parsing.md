---
baseline_commit: dd3813df2173a564392faae06e2891de030fb9a9
---

# Story 2.3: Natural-language food parsing into structured entries

Status: review

## Story

As a user,
I want to type what I ate in plain language and get structured food entries,
so that logging is effortless.

## Acceptance Criteria

1. NL input (e.g. "two eggs, one milk tea, 100g chickpeas, one dhal wade") yields structured editable items: name, quantity, unit, calories, protein, carbs, fat, fibre, sugar, sodium, meal type, datetime, dataSource, confidence (FR-6)
2. Each item carries `dataSource` of `database` or `ai_estimated`
3. Parse failure degrades to manual entry — never a dead end
4. Loading state shows progress + helpful tip (UX-DR3 / FR-10 loading)
5. Ambiguous quantities can be flagged (`needsClarification`) for Story 2.5 chips; mixed known/unknown handled per-item

## Tasks / Subtasks

- [x] Task 1: Zod AI parse schema + domain resolve/match pipeline
- [x] Task 2: Server Action with AiProvider + nutrition DAL (injectable deps)
- [x] Task 3: `/log` UI — input, loading tip, editable draft items, manual fallback
- [x] Task 4: Tests (multi-item, DB match, fail → manual) + README
- [x] Task 5: Story → review

## Dev Notes

- Persist/save FoodEntry is Story 2.6 — this story returns a draft for review in UI only.
- Composite bottom-up breakdown UI is Story 2.4; matching uses FoodDetail totals for now.
- Never log meal free text (FR-31). Log `{ event, purpose, outcome, itemCount }` only.
- Use FakeAiProvider in unit tests; no live Gemini in CI.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- `foodParseAiSchema` + `resolveParsedMeal` match catalog (database) or AI estimate per item
- `parseMealAction` fail-safe → manual fallback copy; never logs meal text
- `/log` UI with loading tips, editable drafts, skip/manual entry
- Dashboard link to Log food; 157 tests green

### File List

- fitme-ai/lib/ai/schemas/food-parse.ts
- fitme-ai/lib/ai/index.ts
- fitme-ai/lib/domain/nutrition/parse-types.ts
- fitme-ai/lib/domain/nutrition/resolve-parse.ts
- fitme-ai/lib/domain/nutrition/scale.ts
- fitme-ai/lib/domain/nutrition/draft-recompute.ts
- fitme-ai/lib/schemas/log.ts
- fitme-ai/lib/rate-limit/config.ts
- fitme-ai/lib/rate-limit/enforce.ts
- fitme-ai/lib/rate-limit/index.ts
- fitme-ai/app/actions/log.ts
- fitme-ai/app/(app)/log/page.tsx
- fitme-ai/app/(app)/log/log-meal-form.tsx
- fitme-ai/app/(app)/dashboard/page.tsx
- fitme-ai/tests/food-parse-resolve.test.ts
- fitme-ai/tests/parse-meal-action.test.ts
- fitme-ai/tests/draft-recompute.test.ts
- fitme-ai/prisma/seed/catalog-data.json
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/2-3-natural-language-food-parsing.md
- _bmad-output/implementation-artifacts/deferred-work.md

### Change Log

- 2026-07-26: Implemented Story 2.3 NL food parsing — status → review
- 2026-07-26: Code review patches — draft recompute, negative macro reject, unsupported unit flag, AI rate limit

### Review Findings

- [x] [Review][Patch] Rescale nutrition when quantity/unit edits on DB drafts [`draft-recompute.ts` + log form]
- [x] [Review][Patch] Reject negative AI estimate macros [`food-parse.ts`]
- [x] [Review][Patch] Flag unsupported catalog units with `needsClarification` [`resolve-parse.ts`]
- [x] [Review][Patch] Rate-limit `parseMealAction` (30/hour) [`rate-limit` + `log.ts`]
- [x] [Review][Defer] Meal-type inference timezone — needs profile timezone on action path
- [x] [Review][Defer] Full macro editors — Story 2.6 confirm/save UI
- [x] [Review][Discard] Auto-scale unknown AI estimates by quantity — estimate unit undefined
