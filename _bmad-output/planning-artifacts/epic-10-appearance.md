---
title: Epic 10 — Appearance (Light / Dark / System)
status: in-progress
updated: 2026-07-30
owner: product + UX
dependsOn:
  - Epic 1 (Settings shell, profile model)
  - UX gap backlog Tier 0 (Settings IA)
inputDocuments:
  - _bmad-output/planning-artifacts/ux-designs/ux-FitMe_AI-2026-07-30/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-FitMe_AI-2026-07-30/DESIGN.md
  - _bmad-output/planning-artifacts/architecture/architecture-FitMe_AI-appearance-2026-07-30/ARCHITECTURE-SPINE.md
decision: UX CU 2026-07-30 — replace OS-only dark with user-controlled appearance
---

# Epic 10: Appearance

## Intent

Let users choose Match system, Light, or Dark from Settings → Display, with instant apply and no flash of wrong theme on load. Signed-in users persist the choice on their profile.

## Outcome

After MVP (Stories 10.1–10.3):

1. Theme applies instantly from Settings without a separate Save button  
2. First paint respects stored preference (FOUC guard)  
3. Profile column `appearancePreference` syncs when signed in  
4. OS theme changes propagate while on Match system  

Phase 2 (Story 10.4): Night mode with warm tokens.

## Story sequence

| ID | Story | Status | Implementation artifact |
|----|--------|--------|-------------------------|
| 10.1 | Theme provider + FOUC + class-based dark CSS | review | `10-1-theme-provider-fouc.md` |
| 10.2 | Settings Appearance control + instant apply | review | `10-2-settings-appearance-control.md` |
| 10.3 | Profile `appearancePreference` migration + sync | review | `10-3-profile-appearance-sync.md` |
| 10.4 | Night mode — warm tokens + fourth mode | backlog | `10-4-night-mode-tokens.md` |

## Architecture refs

- Feature spine: `architecture/architecture-FitMe_AI-appearance-2026-07-30/ARCHITECTURE-SPINE.md`
- UX: `ux-designs/ux-FitMe_AI-2026-07-30/`

## Non-goals (MVP)

- Per-component color pickers  
- Night mode  
- Cross-device timestamp conflict resolution  
