---
title: Epic 8 — Blood Sugar Level Tracker
status: done
updated: 2026-07-27
implemented: 2026-07-27
owner: product + UX
dependsOn:
  - Epic 7 (optional; graphs need both)
  - Epic 6.1 (weight for later correlations)
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/prds/prd-FitMe_AI-2026-07-20/prd.md
decision: User-requested Phase 2+ habit trackers (2026-07-27)
---

# Epic 8: Blood Sugar Level Tracker

## Intent

Manual blood glucose logging (fingerstick-style entries) with context tags — for personal pattern awareness. **Not** a CGM product, **not** medical advice. Feeds Epic 9 (sugar vs weight / fasting).

## Outcome

After this epic a user can:

1. Log glucose with value + unit + timestamp  
2. Tag context (fasting / before meal / after meal / bedtime / other)  
3. See recent readings and a simple day list  
4. Edit/soft-delete a mistaken reading  

**Status:** All stories implemented (2026-07-27). Local polish/review pending user test pass.

## Story sequence

| ID | Story | Status | Implementation artifact |
|----|--------|--------|-------------------------|
| 8.1 | GlucoseEntry model + log action | review | `8-1-glucose-entry-model-log.md` |
| 8.2 | Log UI (value, unit, context, time) | review | `8-2-glucose-log-ui.md` |
| 8.3 | Recent list + edit/soft-delete | review | `8-3-glucose-list-edit-delete.md` |
| 8.4 | Home glance: last reading | review | `8-4-home-glucose-glance.md` |

## Implementation summary

| Area | Location |
|------|----------|
| Model | `GlucoseEntry` + `GlucoseContext` — migration `20260727160000_glucose_entry` |
| Canonical unit | mg/dL (mmol/L converted at edges, AD-11) |
| DAL | `lib/dal/glucose-entry.ts` |
| Actions | `app/actions/glucose.ts` |
| UI | `/glucose`, Home `GlucoseGlance` |
| Tests | `tests/glucose-*.test.ts` |

## UX invariants

- Always labeled as **user-logged measurements**, not clinical diagnosis  
- FR-17: no interpretation like “you are diabetic / prediabetic”; no medication advice  
- Preferred units: mg/dL vs mmol/L (store canonical — recommend **mg/dL** or mmol×18; convert at edges like AD-11)  
- Soft-delete (AD-8); ownership (AD-7)  
- Calm empty states  

## Likely data shape

```
GlucoseEntry {
  id, userId
  valueMgDl          // Int or Float — canonical mg/dL
  measuredAt
  context            // enum: fasting | before_meal | after_meal | bedtime | other
  note?
  deletedAt?
}
```

Profile (or Goal) may gain `preferredGlucoseUnit: mg_dl | mmol_l` for display only.

**v1 note:** Unit is selected per log form; profile preference deferred.

## Out of scope

- CGM / Libre / Dexcom integrations  
- Alerts for hypo/hyper thresholds as medical alarms (optional “personal reminder” later)  
- AI interpretation of glucose patterns  
- Correlation charts → **Epic 9** (implemented on `/progress`)  

## Safety notes

- Prominent disclaimer near log + charts: personal tracker only; not for diagnosis or treatment.  
- Guardrail copy must not invent clinical ranges as diagnosis. Optional educational ranges only if clearly sourced and non-diagnostic.  
