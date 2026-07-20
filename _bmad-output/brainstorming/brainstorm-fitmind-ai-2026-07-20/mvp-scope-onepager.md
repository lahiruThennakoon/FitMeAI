# FitMind AI — MVP Scope One-Pager

**An accurate-data-first calorie tracker: effortless food logging + precise nutrition, powered by AI as the calc engine (conversational coach comes later).**

---

## The Core Pipeline (food logging)

The beating heart of the product: effortless input + precise nutrition. AI parses and decomposes; the **curated database is the source of truth** for the actual numbers.

```
parse (type/speak natural language)
  -> decompose into ingredients + proportions
  -> match curated DB (source of truth, citable)
  -> ask ONE clarifying chip only about the uncertain proportion
  -> confirm / edit
  -> save
```

**Fallback:** when an item is **not in the DB**, AI produces an on-the-fly estimate — clearly **labeled "ESTIMATED" with a confidence level**. User corrections can refine/promote entries over time.

## The Core Loop (why food data matters)

```
calories IN (food)  vs  calories OUT (exercise)  ->  NET calories
```

- Baseline burn auto-estimated from profile (BMR + activity level, formula shown); specific workouts added manually on top. Net works even with **zero exercise logged**.
- A beautifully designed **net-calorie dashboard** is the retention engine — **nudge, not nag**. It makes the user reflect and decide their next move, with or without a set goal.

## Scope — MoSCoW

| Priority | Items |
|---|---|
| **Must (MVP v1)** | User profile creation (step zero); AI food logging pipeline (parse → decompose → match DB → clarifying chip → confirm/edit → save); curated nutrition DB as source of truth + AI-estimated fallback (labeled + confidence); lightweight confirm/edit-before-save step; calorie burn (BMR baseline + manual workouts); net-calorie dashboard; **full safety ladder (green/yellow/red consent) + "no medical advice" guardrails**; cached instant-path fallback (DB + recent/saved) for weak/no network; responsive PWA. |
| **Should** | Body/weight progress + trend charts; AI daily reflection; weekly report; photo food recognition; daily health check-in (sleep/mood/water/steps). |
| **Could** | Barcode scanning; voice food logging; meal planning / grocery / recipe nutrition. |
| **Won't (this time)** | Heavy manual food-search / recently-used / saved-meals / custom-foods UI; wearables; coach/nutritionist portal; multilingual/Sinhala; gamification. |

## Safety Ladder

- 🟢 **Green** — safe target, proceed normally.
- 🟡 **Yellow** — unsafe target: warn + label "not recommended", but let the user proceed (respect autonomy, no hard block).
- 🔴 **Red** — extreme/dangerous case (already underweight, sub-~1000 kcal): warning that requires **explicit user consent/acknowledgement** before proceeding.
- **Never give medical advice** (no recommending pills/supplements/medication). Accuracy of numbers is a safeguard so users don't crash-diet on bad data.

## Speed / Offline

- **AI smart-path** is the default when connected.
- **Cached instant-path** is the graceful fallback on weak/no network — using the cached DB + recently-used/saved foods. One curated DB serves as **both the trust "source" and the offline cache** (kills the accuracy fear and the speed fear at once).

## Platforms

Responsive **PWA** — polished, fully responsive across **Android tablet, iPhone, and laptop browser**.

## First Build Move

**User profile creation (week 1, step zero):** name, age, sex, height, weight, activity level, goal, units, timezone. This feeds BMR + targets + the whole dashboard — foundation before food logging.

---

**Success looks like:** low-effort logging via tappable chips, polished/perfect UX, fully responsive across Android tablet + iPhone + laptop — where a working AI parser and an accurate nutrition DB make logging feel effortless and the user *feels* "this is working" from day one.
