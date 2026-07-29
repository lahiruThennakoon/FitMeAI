---
title: Epic 7 — Fasting Time Tracker
status: done
updated: 2026-07-27
implemented: 2026-07-27
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

**Status:** All stories implemented (2026-07-27). Local polish/review pending user test pass.

## Story sequence

| ID | Story | Status | Implementation artifact |
|----|--------|--------|-------------------------|
| 7.1 | Fasting session model + start/stop | review | `7-1-fasting-session-start-stop.md` |
| 7.2 | Active fast UI (timer + progress) | review | `7-2-active-fast-ui-timer-progress.md` |
| 7.3 | Fasting history list + soft-delete | review | `7-3-fasting-history-soft-delete.md` |
| 7.4 | Home glance: fasting status chip | review | `7-4-home-fasting-status-chip.md` |

## Implementation summary

| Area | Location |
|------|----------|
| Model | `FastingSession` — migration `20260727150000_fasting_session` |
| DAL | `lib/dal/fasting-session.ts` |
| Actions | `app/actions/fasting.ts` (start, end, delete) |
| UI | `/fasting`, Home `FastingStatusChip` |
| Tests | `tests/fasting-*.test.ts` |

## UX invariants

- Calm, supportive copy (UX-DR2) — never shame for breaking a fast early  
- Estimates/timers are clocks, not health advice  
- Soft-delete sessions (AD-8)  
- Day/time in profile timezone (AD-10)  
- No medical advice (FR-17): no claims about autophagy, insulin, disease  

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
- Correlation charts → **Epic 9** (implemented)  

## Safety notes

- Copy must not encourage disordered eating or unsafe prolonged fasting.  
- Optional soft ceiling warning (e.g. >72h) → “consider checking with a clinician” — not a hard block in v1 unless product decides.  
