---
baseline_commit: d08974fdef10563aeafb53e45b90daea0ccb9088
---

# Story 2.2: Provider-agnostic AI layer with schema-validated outputs

Status: review

## Story

As a developer,
I want a swappable AI port whose outputs are schema-validated,
so that the app is not coupled to one provider and never consumes malformed/unsafe AI output.

## Acceptance Criteria

1. `AiProvider` port in `lib/ai/` with a Gemini adapter (AD-4, FR-18)
2. Every AI response is parsed against a Zod schema before use; validation failure fails safe (no entry produced; safe error for retry/manual) (AD-4)
3. Switching provider is config/adapter only — call sites depend on the port (NFR-AIIndependence)
4. Malformed JSON, partial fields, and provider timeout return safe errors (no thrown leak of payloads)

## Tasks / Subtasks

- [x] Task 1: Port types + pure JSON/Zod parse helpers
- [x] Task 2: Gemini adapter (fetch, timeout, JSON mode) + fake adapter for tests
- [x] Task 3: Factory/config (`AI_PROVIDER`, `GEMINI_API_KEY`, model, timeout)
- [x] Task 4: Schema fixture tests + adapter swap tests
- [x] Task 5: README + env example + story → review

## Dev Notes

- Food parsing UI / FoodEntry persist are Story 2.3+ — this story is the AI infrastructure only.
- Prefer `fetch` to Gemini REST (no new SDK) to match Resend mail adapter pattern.
- Never log prompts, raw model text, or API keys (FR-31 / AD-9). Log only `{ event, purpose, providerId, code }`.
- Call sites always receive `AiResult<T>`; do not throw on validation failure.
- Optional `responseSchema` JSON hint for Gemini; Zod remains the authority.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- `AiProvider` port with `generateStructured` returning fail-safe `AiResult<T>`
- Pure `parseAndValidate` / `extractJsonText` (fenced JSON, malformed, partial fields)
- Gemini REST adapter (JSON mode, timeout/abort, no SDK) + Fake adapter for tests
- Factory swaps via `AI_PROVIDER` / `GEMINI_API_KEY` / `AI_MODEL` / `AI_TIMEOUT_MS`
- 17 new AI unit tests; typecheck + lint green

### File List

- fitme-ai/lib/ai/types.ts
- fitme-ai/lib/ai/parse.ts
- fitme-ai/lib/ai/log-meta.ts
- fitme-ai/lib/ai/gemini.ts
- fitme-ai/lib/ai/fake.ts
- fitme-ai/lib/ai/config.ts
- fitme-ai/lib/ai/index.ts
- fitme-ai/lib/ai/schemas/structured-echo.ts
- fitme-ai/lib/env.ts
- fitme-ai/tests/ai-parse.test.ts
- fitme-ai/tests/ai-provider.test.ts
- fitme-ai/.env.example
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/2-2-provider-agnostic-ai-layer.md
- _bmad-output/implementation-artifacts/deferred-work.md

### Change Log

- 2026-07-26: Implemented Story 2.2 provider-agnostic AI layer — status → review
- 2026-07-26: Code review patches — sanitized purpose logs, non-JSON HTTP body handling

### Review Findings

- [x] [Review][Patch] Sanitize `purpose` before logging so meal/free text cannot leak [`fitme-ai/lib/ai/log-meta.ts`]
- [x] [Review][Patch] Treat non-JSON HTTP 200 bodies as `provider_error` without leaking payload [`fitme-ai/lib/ai/gemini.ts`]
- [x] [Review][Patch] Clarify timeout vs external abort using `signal.reason` [`fitme-ai/lib/ai/gemini.ts`]
- [x] [Review][Defer] Process-scoped `getAiProvider` singleton — env swap needs restart
- [x] [Review][Defer] Brace-balanced JSON extract for trailing prose — fail-safe today
