---
title: Epic 8 — Blood Sugar Level Tracker
status: planned
updated: 2026-07-27
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

## UX invariants

- Always labeled as **user-logged measurements**, not clinical diagnosis  
- FR-17: no interpretation like “you are diabetic / prediabetic”; no medication advice  
- Preferred units: mg/dL vs mmol/L (store canonical — recommend **mg/dL** or mmol×18; convert at edges like AD-11)  
- Soft-delete (AD-8); ownership (AD-7)  
- Calm empty states  

## Story sequence

| ID | Story | Depends on | Value |
|----|--------|------------|--------|
| 8.1 | GlucoseEntry model + log action | 1.6 | Persist readings |
| 8.2 | Log UI (value, unit, context, time) | 8.1 | Daily capture |
| 8.3 | Recent list + edit/soft-delete | 8.1, 5.2 patterns | Trust |
| 8.4 | Home glance: last reading (optional) | 8.2 | Awareness |

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

## Out of scope

- CGM / Libre / Dexcom integrations  
- Alerts for hypo/hyper thresholds as medical alarms (optional “personal reminder” later)  
- AI interpretation of glucose patterns  
- Correlation charts (Epic 9)  

## Safety notes

- Prominent disclaimer near log + charts: personal tracker only; not for diagnosis or treatment.  
- Guardrail copy must not invent clinical ranges as diagnosis. Optional educational ranges only if clearly sourced and non-diagnostic.  
