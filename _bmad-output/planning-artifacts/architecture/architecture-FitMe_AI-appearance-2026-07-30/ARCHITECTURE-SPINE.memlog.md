---
workspace: architecture-FitMe_AI-appearance-2026-07-30
scope: User-controlled light / dark / system appearance (MVP)
purpose: build-substrate
altitude: feature
---

# Memlog — FitMe AI Appearance

## Entries

- **constraint** Inherited AD-1, AD-2, AD-7, AD-9 from initiative spine — profile sync via DAL + validated server action only.
- **decision** Custom class-based theme on `<html>` instead of `next-themes` — three modes, minimal FOUC script, no new dependency; prevents bundle bloat and attribute/SSR mismatch for this scope.
- **decision** AD-A1: `@custom-variant dark` + `.dark` token block replaces `@media (prefers-color-scheme)` as sole dark driver; prevents user choice being ignored.
- **decision** AD-A2: Shared enum `system | light | dark` in domain, Prisma, localStorage; prevents client/server drift.
- **decision** AD-A3: Blocking inline script in `ThemeInit` before paint; prevents FOUC for dark users. Profile fallback embedded when localStorage empty (2026-07-30 patch).
- **decision** AD-A4: localStorage instant apply, profile sync on user toggle; prevents toggle latency and mid-session server override.
- **decision** AD-A5: `matchMedia` listener while on system; prevents stale theme on OS change.
- **direction** Night mode deferred to Story 10.4 — warm tokens + enum extension.
- **assumption** Cross-device appearance sync is nice-to-have; MVP does not compare timestamps on login.
- **event** spine finalized 2026-07-30
