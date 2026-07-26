---
title: Epic 5 — Daily Habit Loop
status: planned
updated: 2026-07-26
owner: product + UX
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/prds/prd-FitMe_AI-2026-07-20/prd.md
decision: Option A — full five-story epic (confirmed 2026-07-26)
---

# Epic 5: Daily Habit Loop

## Intent

Epics 1–4 delivered a trustworthy tracker. Epic 5 makes it **livable every day**: finish incomplete Home loops, fix mistakes, look back one day, and re-log faster — without guilt framing.

## Outcome

After this epic a user can:

1. Log water and see progress on Home  
2. Edit or soft-delete today’s meals and workouts  
3. Flip Home between today and yesterday (timezone-correct)  
4. Re-log recent/favorite foods in one tap  

## UX invariants

- Calm, supportive copy (UX-DR2) — never “deficit” / shame language  
- Over-limit → red **↑** beside the number  
- Soft cards, brand CTAs, shared page shells  
- Day bounds from profile timezone (AD-10)  
- Estimates stay labelled as estimates  

## Story sequence

| ID | Story | Depends on | Value |
|----|--------|------------|--------|
| 5.1 | Water logging | 1.6, 3.3 | Completes FR-15 water on Home |
| 5.2 | Edit / delete today’s meals | 2.6, 3.3 | Trust when mistakes happen |
| 5.3 | Edit / delete today’s exercise | 3.2, 3.3 | Honest burn |
| 5.4 | Day switcher on Home | 3.3, 5.1 | Habit / history seed |
| 5.5 | Recent & favorites on Log | 2.6, 4.1 | Faster daily logging |

Implement in order **5.1 → 5.2 → 5.3 → 5.4 → 5.5** unless a spike shows 5.2/5.3 can share a single “entry actions” pattern built once.

## Out of scope (later)

- Photo / barcode / voice logging  
- Weekly reports & coaching reflections  
- Multi-week history charts  
- Social / sharing  

## Story briefs

### 5.1 Water logging

**User story:** As a user, I want to log water against my daily aim, so Home shows real progress.

**Acceptance criteria**

1. Quick-add amounts (e.g. 250 / 500 ml) + custom ml  
2. Home Water card shows `consumed of target` with progress  
3. Totals scoped to profile timezone day  
4. No goal → soft default aim, labelled as estimate  
5. Overshoot → red ↑, no shame copy  
6. Per-user isolation; tests for add, day rollover, panel render  

**Likely shape:** `WaterEntry` (or daily aggregate) + server action + Home control in `DailySummaryPanel`.

### 5.2 Edit / delete today’s meals

**User story:** As a user, I want to fix or remove a meal logged today, so bad numbers don’t stick.

**Acceptance criteria**

1. From Home (and/or Log) open an entry → edit name/qty/macros or soft-delete  
2. Soft-delete via `deletedAt`; calm confirm  
3. Dashboard refreshes immediately after save/delete  
4. Only own entries mutable  
5. Tests: edit, soft-delete, cross-user denied  

### 5.3 Edit / delete today’s exercise

**User story:** As a user, I want to fix or remove a workout logged today, so burn stays honest.

**Acceptance criteria**

1. Edit type/duration/intensity (recompute estimate) or soft-delete  
2. Estimates remain labelled  
3. Energy balance updates on Home  
4. Isolation + validation (e.g. duration > 0)  
5. Tests: edit, soft-delete, isolation  

### 5.4 Day switcher on Home

**User story:** As a user, I want to view yesterday and return to today, so one day isn’t the whole story.

**Acceptance criteria**

1. Control to move to previous local day / back to today  
2. All summary slices (food, exercise, water, energy) use selected day key  
3. Clear “Today” vs date label  
4. Future days not offered in this story  
5. Empty past day: encouraging empty state  
6. Tests: timezone boundary, empty yesterday, return today  

### 5.5 Recent & favorites on Log

**User story:** As a user, I want one-tap re-log of recent meals, so everyday foods don’t need a full parse.

**Acceptance criteria**

1. Log page shows recent saved foods/meals  
2. User can favorite/unfavorite  
3. Tap creates a **new** today entry (no silent overwrite)  
4. Source clear (recent / favorite); no fake AI precision  
5. Offline when item is in catalog cache (align with FR-16)  
6. Tests: re-log, favorite persist, empty state  

## Next workflow step

When ready to build:

1. Run **create story** for `5.1` → implementation artifact  
2. Dev story → review → commit → push  
3. Repeat through 5.5  
4. Optional: sprint-status tracker for Epic 5  

## Open product notes

- Water unit display should respect preferred units (ml vs fl oz) from profile.  
- Day switcher v1 = today + yesterday only is enough; expandable later.  
- Favorites may start as “pin recent” without a separate entity if simpler — prefer a real `favorite` flag if schema stays clean.
