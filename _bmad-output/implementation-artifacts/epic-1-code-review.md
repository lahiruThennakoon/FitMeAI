---
date: 2026-07-25
scope: Stories 1.2–1.6 (uncommitted Epic 1)
review_mode: full
---

# Epic 1 Code Review — Triaged Findings

Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor (all completed).

## Review Findings

### Decision needed

- [ ] [Review][Decision] Override-any-target only wired for calories in UI — AC/FR-4 say every Target is overridable; schema allows all fields but `goals-form.tsx` only exposes calorie override. Choose: (1) add override inputs for all targets now, or (2) defer non-calorie overrides to a follow-up and narrow the story note.
- [ ] [Review][Decision] Dev console prints full verification/reset URLs (with tokens) — intentional local DX without Resend, but conflicts with Story 1.2 “never tokens in logs.” Choose: (1) keep terminal print for local-only (document as exception), (2) print redacted + add a `scripts/get-verify-link` helper, or (3) remove console token print.

### Patch

- [ ] [Review][Patch] Add Better Auth `nextCookies()` plugin so Server Action sign-in/delete set cookies [`fitme-ai/lib/auth.ts`]
- [ ] [Review][Patch] Always return neutral success from `requestPasswordResetAction` even when mail throws [`fitme-ai/app/actions/auth.ts`]
- [ ] [Review][Patch] Redact path-embedded reset tokens in structured `path` log (not only `?token=`) [`fitme-ai/lib/email/send-email.ts`]
- [ ] [Review][Patch] Map login “unverified” only on `EMAIL_NOT_VERIFIED`, not all `FORBIDDEN` [`fitme-ai/lib/auth/actions-shared.ts`]
- [ ] [Review][Patch] Reject whitespace-only passwords/tokens; trim/normalize emails [`fitme-ai/lib/schemas/auth.ts`]
- [ ] [Review][Patch] Bound target overrides (min 0 + sane ceilings); cap dietary preference string length [`fitme-ai/lib/schemas/profile.ts`]
- [ ] [Review][Patch] Validate timezone as IANA [`fitme-ai/lib/schemas/profile.ts`]
- [ ] [Review][Patch] Add `(app)/layout.tsx` session guard choke-point [`fitme-ai/app/(app)/layout.tsx`]
- [ ] [Review][Patch] Add sign-out control on dashboard/settings [`fitme-ai/app/(app)/`]
- [ ] [Review][Patch] Align live preview age bounds with schema; harden unit toggle when values invalid [`fitme-ai/app/(app)/goals/goals-form.tsx`]
- [ ] [Review][Patch] Align imperial height/weight floors with metric after conversion [`fitme-ai/lib/schemas/profile.ts`]

### Deferred

- [x] [Review][Defer] `getServerEnv()` unused at bootstrap [`fitme-ai/lib/env.ts`] — deferred, pre-existing (Story 1.1)
- [x] [Review][Defer] Orphan user when signup succeeds but verification send fails — accepted Decision A behavior; cleanup/resend UX later
- [x] [Review][Defer] Injectable `deps` on Server Actions for tests — refactor to `vi.mock` in a hardening pass
- [x] [Review][Defer] Missing DB-level hashed-password / session-invalidation / post-delete cascade integration tests — rely on BA + unit mocks for now
- [x] [Review][Defer] Timezone does not yet drive day-boundary aggregation — AD-10 consumer is later stories
- [x] [Review][Defer] DAL helpers take raw `userId` without `requireSession` — actions are the choke point today; tighten in DAL hardening

### Dismissed (noise)

- Protected pages use `getSession`+redirect vs `requireSession` — equivalent for null session
- Partial-macro recompute after calorie-only override — product heuristic, not a defect until full override UI decision
