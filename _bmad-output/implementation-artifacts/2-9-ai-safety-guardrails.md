---
baseline_commit: 0eaa757
---

# Story 2.9: AI safety guardrails

Status: done

## Story

As a user,
I want the AI to never give medical advice or shame me,
so that the app is safe and supportive.

## Acceptance Criteria

1. Any AI-generated user-facing text passes a guardrail check before display/persist (FR-17, AD-5)
2. Violations are blocked and regenerated (bounded); then safe-fail with retry/manual copy
3. AI never diagnoses, recommends medication/supplements, or uses guilt/judgmental language
4. Estimated values stay marked; AI never invents precise values presented as known (provenance stays on resolve path)

## Tasks / Subtasks

- [x] Task 1: Shared safety system instruction + output checker (`lib/ai/guardrails.ts`)
- [x] Task 2: `GuardedAiProvider` wrap in `createAiProvider` (regen ≤2 then fail)
- [x] Task 3: Strengthen food-parse system prompt; `guardrail_blocked` safe error
- [x] Task 4: Adversarial + tone unit tests; README → review

## Dev Notes

- Guard at the port wrapper so every adapter (Gemini/OpenAI/fake) is covered.
- Never log raw prompts/responses on guardrail hits (FR-31) — log `{ event, purpose, code, attempt }` only.
- Food names like "fat tip" / schema keys `fatG` must not false-positive; match phrase patterns, not bare "fat".
- Estimate provenance remains `resolve-parse` / `estimate-fallback` (Story 2.8); guardrails reinforce system prompt + block unsafe prose.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- `checkAiOutput` / `checkAiOutputText` for medical, shaming, false-precision phrases
- `GuardedAiProvider` injects `SAFETY_SYSTEM_INSTRUCTION`, regenerates once, then `guardrail_blocked`
- `createAiProvider` always wraps adapters
- Adversarial unit tests including food-name field scan

### File List

- fitme-ai/lib/ai/guardrails.ts
- fitme-ai/lib/ai/guarded-provider.ts
- fitme-ai/lib/ai/types.ts
- fitme-ai/lib/ai/config.ts
- fitme-ai/lib/ai/index.ts
- fitme-ai/lib/ai/schemas/food-parse.ts
- fitme-ai/tests/ai-guardrails.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/2-9-ai-safety-guardrails.md

### Change Log

- 2026-07-26: Implemented Story 2.9 AI safety guardrails — status → review
- 2026-07-26: Review patches applied — status → done

### Review Findings

- [x] [Review][Patch] Drop bare `pig` shaming pattern (food false-positive risk) [`guardrails.ts`]
- [x] [Review][Defer] Regex guardrails are English-centric; Sinhala/Tamil unsafe copy needs later locale expansion
