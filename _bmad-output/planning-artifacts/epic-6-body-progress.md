---
title: Epic 6 — Body Progress
status: in-progress
updated: 2026-07-27
owner: product + UX
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/prds/prd-FitMe_AI-2026-07-20/prd.md
  - _bmad-output/planning-artifacts/briefs/brief-FitMe_AI-2026-07-20/brief.md
decision: Phase 2 Should — body/weight progress (confirmed after Epic 5)
---

# Epic 6: Body Progress

## Intent

Epics 1–5 made daily logging livable. Epic 6 adds **calm body progress**: weigh-ins that update the live profile weight (so burn/targets stay honest) and a simple trend toward target — without guilt framing.

## Outcome

After this epic a user can:

1. Log a weight check-in in preferred units  
2. See recent weigh-ins and distance to target  
3. See a simple trend via **Progress** (`time × weight`) — Story 6.2 absorbed into Epic 9.5  
4. See **pacing vs weekly plan** on Profile when they override an aggressive rate (e.g. 1 kg/week) — Story 6.3  

## Story sequence

| ID | Story | Status | Implementation artifact |
|----|--------|--------|-------------------------|
| 6.1 | Weight check-in log | review | `6-1-weight-check-in-log.md` |
| 6.2 | Weight trend sparkline | absorbed | `6-2-weight-trend-sparkline.md` → see `9-5-weight-trend-via-progress.md` |
| 6.3 | Weight pacing vs plan | review | `6-3-weight-pacing-feedback.md` |

## Out of scope

- Photo / barcode body scans  
- Coach sharing  
- Clinical BMI advice beyond existing safety ladder on targets  
- Multi-metric correlation graphs → **Epic 9**  
- Fasting / glucose logging → **Epics 7–8**  
