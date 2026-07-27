---
title: Epic 9 — Flexible Correlation Graphs
status: planned
updated: 2026-07-27
owner: product + UX
dependsOn:
  - Epic 6.1 (weight series)
  - Epic 7 (fasting duration series)
  - Epic 8 (glucose series)
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture/architecture-FitMe_AI-2026-07-20/ARCHITECTURE-SPINE.md
decision: User-requested Phase 2+ analytics (2026-07-27); charting library deferred until this epic (Recharts vs Visx per Architecture Spine)
---

# Epic 9: Flexible Correlation Graphs

## Intent

A Progress / Insights surface where the user picks **X** and **Y** from available metrics and sees a calm scatter or dual-axis trend — e.g. weight vs sugar, fasting duration vs sugar, fasting vs weight. Curiosity over judgment.

## Outcome

After this epic a user can:

1. Open a Progress/Insights page  
2. Choose X and Y from a fixed metric catalog  
3. See a graph for a selectable time range (e.g. 7 / 30 / 90 days)  
4. Switch pairs without leaving the page  
5. Understand empty states when a series has too few points  

## Metric catalog (v1)

| Metric id | Source | Series point |
|-----------|--------|----------------|
| `weight` | WeightEntry | recordedAt → weightG (display kg/lb) |
| `glucose` | GlucoseEntry | measuredAt → valueMgDl (display unit) |
| `fasting_duration` | FastingSession (ended) | endedAt → duration hours |

**v1 pairs (examples):** weight×glucose, fasting×glucose, fasting×weight, and same-metric trends (X=time, Y=metric) via a `time` pseudo-axis.

## UX invariants

- No medical conclusions drawn from correlations  
- Axes clearly labeled with units + “your logged data”  
- Prefer Recharts or Visx — decide in Story 9.1 spike (Architecture Spine deferred decision)  
- Soft cards / calm chrome consistent with Home  
- Insufficient data → encourage logging, never shame  

## Story sequence

| ID | Story | Depends on | Value |
|----|--------|------------|--------|
| 9.1 | Chart library spike + Progress page shell | 6.1 | Foundation |
| 9.2 | Metric series DAL (time-bounded queries) | 6.1, 7.x, 8.x | Data contract |
| 9.3 | XY picker + scatter/line renderer | 9.1, 9.2 | Core product |
| 9.4 | Time-range control + empty/sparse states | 9.3 | Usability |
| 9.5 | Optional: absorb weight sparkline (was 6.2) | 9.3 | Unifyates Epic 6.2 |

## Technical notes

- Align points by day-bucket in profile timezone (AD-10) for “same day” correlations; for scatter, use nearest-neighbor or same-calendar-day join — document choice in 9.2.  
- Server builds series DTOs; client only renders.  
- No PII/health values in logs (AD-9).  

## Out of scope

- Statistical significance / R² medical claims  
- Export to CSV (nice-later)  
- More than 2 axes / 3D  
- Real-time CGM streams  

## Relationship to Epic 6.2

Story **6.2 weight sparkline** can stay as a thin interim on Profile, or be **skipped** and delivered as the `time × weight` preset inside Epic 9. Prefer one charting stack — avoid two libraries.  
