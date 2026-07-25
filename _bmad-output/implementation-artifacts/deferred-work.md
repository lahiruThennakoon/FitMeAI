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

