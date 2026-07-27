---
title: Epic 7 — Fasting Time Tracker
status: planned
updated: 2026-07-27
owner: product + UX
dependsOn:
  - Epic 5 (Home habit loop)
  - Epic 6.1 (weight history useful later for correlations)
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture/architecture-FitMe_AI-2026-07-20/ARCHITECTURE-SPINE.md
decision: User-requested Phase 2+ habit trackers (2026-07-27)
---

# Epic 7: Fasting Time Tracker

## Intent

Let users start/stop a fast, see elapsed time, and keep a calm history — without medical claims or “you failed” framing. Data feeds Epic 9 correlation graphs (fasting vs weight / sugar).

## Outcome

After this epic a user can:

1. Start a fast (optional planned duration / protocol label)  
2. See a live timer while fasting  
3. End a fast and save duration  
4. View recent fasting sessions on a dedicated surface (and glanceable status on Home)  

## UX invariants

- Calm, supportive copy (UX-DR2) — never shame for breaking a fast early  
- Estimates/timers are clocks, not health advice  
- Soft-delete sessions (AD-8)  
- Day/time in profile timezone (AD-10)  
- No medical advice (FR-17): no claims about autophagy, insulin, disease  

## Story sequence

| ID | Story | Depends on | Value |
|----|--------|------------|--------|
| 7.1 | Fasting session model + start/stop | 1.6 | Core timer persistence |
| 7.2 | Active fast UI (timer + End) | 7.1 | Daily habit affordance |
| 7.3 | Fasting history list + soft-delete | 7.1 | Trust / fix mistakes |
| 7.4 | Home glance: fasting status chip | 7.2, 5.x | Habit loop visibility |

## Likely data shape

```
FastingSession {
  id, userId
  startedAt, endedAt?          // null = active
  plannedDurationMin?          // optional goal (e.g. 16h)
  protocolLabel?               // e.g. "16:8", "custom" — free text or enum v1
  notes?
  deletedAt?
}
```

**Invariant:** at most one active session per user (`endedAt IS NULL AND deletedAt IS NULL`).

## Out of scope

- Wearable / Apple Health sync  
- Auto meal-blocking during fast  
- Medical fasting protocols / clinical claims  
- Correlation charts (Epic 9)  

## Safety notes

- Copy must not encourage disordered eating or unsafe prolonged fasting.  
- Optional soft ceiling warning (e.g. >72h) → “consider checking with a clinician” — not a hard block in v1 unless product decides.  
