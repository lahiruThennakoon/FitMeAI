# FitMind AI — Brainstorm Intent

## 1. Product
FitMind AI is an accuracy-first calorie & nutrition tracker (PWA) that turns effortless food input into precise, sourced nutrition data, balanced against calories burned.

## 2. Target User + Core Insight
- **Persona (Nimali):** wants usability above all, but fears inaccurate nutrition/estimates; her non-negotiable is that the app be precise when taking inputs.
- **Core tension:** accuracy vs. usability — resolved by AI asking a FEW clarifying questions via tappable multiple-choice chips (fast AND precise).
- **Domain focus:** Sri Lankan food — composite local dishes must decompose accurately into ingredients.

## 3. Beating Heart
Effortless food-calorie input + precise nutrition calculation. Everything else is secondary.

## 4. Key Product Decisions
- **Tiered nutrition model (source of truth = curated DB):**
  1. Curated ingredient/food nutrition DB match = trusted, citable source of truth.
  2. AI role = parse language → decompose composite dish into ingredients/proportions → match DB entries → estimate proportions.
  3. AI-estimated fallback when not in DB, clearly labeled ESTIMATED with a confidence level; user corrections can promote/refine entries.
- **Clarifying chips:** AI asks only about uncertain proportions using tappable multiple-choice answers.
- **Confirm/edit before save:** lightweight review moment kept in MVP1 (essential for accuracy/trust).
- **Source citations:** show where each nutrition value came from so numbers feel credible, not invented. Show loading time + helpful tips during processing.
- **Two-lane speed/offline fallback:** AI smart-path default when connected; instant no-AI path on weak/no network using cached DB + recent/saved foods. (Curated DB doubles as both trust source and offline cache.)
- **Calories out:** baseline burn auto-estimated from profile (BMR + activity level, formula shown); specific workouts entered manually on top. Net calories works even with zero exercise logged.
- **Net-calorie dashboard:** calories in vs. burnt, beautifully designed — a nudge-not-nag motivation engine that makes the user reflect and decide their next move (works with or without a set goal).

## 5. Safety Stance
- App must NEVER give medical advice (no recommending pills/supplements/medication).
- **Green/yellow/red safety ladder:** normal unsafe target = yellow warn + label "not recommended" but allow proceed (respects autonomy, no hard block); extreme/dangerous case (already underweight, sub-~1000 kcal) = RED warning requiring explicit user consent/acknowledgement.

## 6. MVP Scope Line
AI in v1 = the nutrition/calorie **calculation engine + guidance/instructions**. The conversational "AI coach" (daily reflection, coaching) is **deferred** to a later phase.

## 7. MoSCoW
- **Must (MVP1):** user profile creation; AI food logging (parse → decompose → DB match → chip clarify → confirm/edit → save); tiered nutrition model with sourced DB + labeled AI estimates; calorie burn (auto BMR baseline + manual workouts); net-calorie dashboard; two-lane offline fallback; full safety ladder (green/yellow/red consent) + no-medical-advice guardrails.
- **Should (Phase 2/3):** body/weight progress + trend charts; AI daily reflection; weekly report; photo food recognition; daily health check-in (sleep/mood/water/steps).
- **Could (later):** barcode scanning; voice food logging; meal planning / grocery / recipe nutrition.
- **Won't (this time):** manual food-search / recently-used / saved-meals / custom-foods UI; wearables; coach/nutritionist portal; multilingual/Sinhala; gamification. (Note: the *review/confirm-before-save* moment is kept; only the heavy manual food-search UI is cut.)

## 8. First Move
Step zero (week 1): build **user profile creation** (name/age/sex/height/weight/activity/goal/units/timezone) — this feeds BMR + targets + the whole dashboard. Foundation before food logging.

## 9. Synthesis Connections
1. Chips + ingredient-decomposition + DB-then-AI fallback are **one pipeline**: parse → decompose → match DB → ask chip only about uncertain proportion → confirm/save.
2. The curated DB is **both** the trust "source" **and** the offline cache — one asset kills the accuracy fear AND the speed fear.
3. The in-vs-out dashboard is the **retention/behavior-change engine** ("make him thinking"), not just a readout.
4. MVP discipline: **AI as calc engine now, conversational coach later.** Chosen direction = build an accurate-data-first tracker, with profile as step zero.
