---
title: Epic 9 — Flexible Correlation Graphs
status: done
updated: 2026-07-27
implemented: 2026-07-27
owner: product + UX
dependsOn:
  - Epic 6.1 (weight series)
  - Epic 7 (fasting duration series)
  - Epic 8 (glucose series)
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture/architecture-FitMe_AI-2026-07-20/ARCHITECTURE-SPINE.md
decision: User-requested Phase 2+ analytics (2026-07-27); charting uses lightweight SVG (Recharts/Visx deferred)
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

**Status:** All stories implemented (2026-07-27). Story 9.5 absorbs Epic 6.2 weight sparkline.

## Story sequence

| ID | Story | Status | Implementation artifact |
|----|--------|--------|-------------------------|
| 9.1 | Progress page shell + chart spike | review | `9-1-progress-page-shell-chart-spike.md` |
| 9.2 | Metric series DAL | review | `9-2-metric-series-dal.md` |
| 9.3 | XY picker + scatter/line renderer | review | `9-3-xy-picker-scatter-line-renderer.md` |
| 9.4 | Time-range + empty/sparse states | review | `9-4-time-range-empty-states.md` |
| 9.5 | Weight trend via Progress (absorbs 6.2) | done | `9-5-weight-trend-via-progress.md` |

## Implementation summary

| Area | Location |
|------|----------|
| Page | `/progress` (`?x=&y=&days=`) |
| DAL | `lib/dal/metric-series.ts` — same-calendar-day join (AD-10) |
| Chart | SVG `ProgressChart` + `chart-scale.ts` (nice ticks, grid, date labels) |
| Catalog | `lib/domain/progress/metrics.ts` |
| Default | `time × weight`, 30 days |
| Tests | `tests/progress-metrics.test.ts` |

## Chart library decision (Story 9.1)

**Chose:** inline SVG React component — zero new dependencies, sufficient for v1 line/scatter. Recharts or Visx can replace the renderer later without changing the DAL contract.

## Metric catalog (v1)

| Metric id | Source | Series point |
|-----------|--------|----------------|
| `weight` | WeightEntry | recordedAt → weightG (display kg/lb) |
| `glucose` | GlucoseEntry | measuredAt → valueMgDl (display unit) |
| `fasting_duration` | FastingSession (ended) | endedAt → duration hours |
| `time` | pseudo-axis | calendar day / timestamp for trends |

**v1 pairs (examples):** weight×glucose, fasting×glucose, fasting×weight, and `time × metric` trends.

## UX invariants

- No medical conclusions drawn from correlations  
- Axes clearly labeled with units + “your logged data”  
- **v1 uses lightweight SVG** (see Story 9.1 spike); Recharts/Visx swap optional later  
- Soft cards / calm chrome consistent with Home  
- Insufficient data → encourage logging, never shame  

## Technical notes

- Align points by day-bucket in profile timezone (AD-10) for “same day” correlations; scatter uses **same-calendar-day join** (latest weight/glucose per day).  
- Server builds series DTOs; client only renders.  
- No PII/health values in logs (AD-9).  

## Out of scope

- Statistical significance / R² medical claims  
- Export to CSV (nice-later)  
- More than 2 axes / 3D  
- Real-time CGM streams  

## Relationship to Epic 6.2

Story **6.2 weight sparkline** was **absorbed** into Epic 9.5 as the `time × weight` preset on `/progress`. No separate Profile sparkline in v1.
