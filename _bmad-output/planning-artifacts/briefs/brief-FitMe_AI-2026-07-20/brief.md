---
title: "Product Brief: FitMind AI"
status: final
created: 2026-07-20
updated: 2026-07-20
---

# Product Brief: FitMind AI

## Executive Summary

FitMind AI is an accuracy-first personal calorie and nutrition tracker, delivered as a responsive Progressive Web App, built for people who have quit every other tracker because logging their real food felt impossible and inaccurate. Its beating heart is a single promise: **effortless food input that produces precise, *sourced* nutrition data** — then balances it against calories burned so the user always knows where they stand.

The core innovation is not "AI that guesses calories." It is a disciplined pipeline where a **curated nutrition database is the source of truth** and AI is the smart translator that parses natural language, decomposes a composite dish (like rice and curry with three sides) into ingredients and proportions, matches them to that database, and asks *one* tappable clarifying question only about what is genuinely uncertain. When a food is not in the database, AI provides a clearly labeled estimate with a confidence level — never silently faking precision.

The initial audience is Sri Lankan users, whose everyday foods (kottu, pol sambol, dhal wade, string hoppers) are poorly served by Western calorie apps. Why now: AI language parsing has finally become good enough to make natural-language logging fast *and* structured, which is exactly the wedge that turns a 3-minute chore into a sub-30-second habit.

## The Problem

People who want to manage their weight and health try calorie trackers and abandon them within weeks. Three failures compound:

- **Logging local food is painful.** Composite Sri Lankan meals don't map to a Western food database. Users give up trying to log "rice and curry" accurately, so the data becomes garbage and the app becomes pointless.
- **The numbers feel invented.** When an app shows a calorie figure with no basis, users don't trust it — and a health app that isn't trusted is deleted. Trust, not features, is the retention lever.
- **The experience punishes daily use.** Slow logging, guilt-based messaging, and rigid flows make the daily habit feel like a chore. On a weak mobile connection at a restaurant, most apps simply fail.

The cost of the status quo: users stay in the dark about their intake, make no sustained progress, and conclude that tracking "doesn't work for me."

## The Solution

FitMind AI lets a user log a meal by typing or speaking natural language. Behind the scenes:

```
parse → decompose into ingredients + proportions → match curated DB (source of truth)
      → ask ONE clarifying chip only about the uncertain proportion → confirm/edit → save
```

Every value carries a visible **source**; unknown foods fall back to an AI estimate that is explicitly **labeled "estimated" with a confidence level**. A lightweight confirm/edit step protects accuracy without slowing the user down. The same curated database doubles as an offline cache, so common logs stay instant even on a weak network — one asset that answers both the accuracy fear and the speed fear.

Food intake is balanced against calories burned (auto-estimated baseline from the user's profile, plus optional manual workout logging) on a clean **net-calorie dashboard** that acts as a gentle nudge — it makes the user reflect and decide their next move, never shames them. Safety is built in: unsafe targets trigger a graded warning ladder, and the app never gives medical advice.

## What Makes This Different

- **Accurate-data-first, not chatbot-first.** Most AI health apps ship a conversational coach on top of shaky numbers. FitMind AI inverts this: get the *calculation engine* trustworthy first; the conversational coach comes later. [ASSUMPTION] This ordering is the primary product bet.
- **Genuine Sri Lankan food coverage** via ingredient-level decomposition, not a bolted-on food list.
- **Trust as a designed feature** — visible sources, labeled estimates, confidence levels, and a user-review step — rather than an afterthought.
- **Honest about limits.** Estimates are never dressed up as medical fact. The moat is execution and local-market fit, not a defensible technical secret.

## Who This Serves

**Primary — the returning quitter (persona "Nimali", ~34, Colombo).** Has abandoned multiple calorie apps. Wants usability above all but will not tolerate inaccuracy; her non-negotiable is that the app be *precise when taking inputs*. Success for her: logging a common meal in under 30 seconds, one-handed, and *believing* the numbers.

**Later — multiple users, then optional health-coach / nutritionist access.** [ASSUMPTION] Single-user is the MVP boundary; multi-user and coach portals are explicitly deferred.

## Success Criteria

User-success signals (the ones that matter for retention):

- A common meal can be logged in **under 30 seconds**, one-handed. [ASSUMPTION] Target metric.
- The user trusts the numbers enough to keep logging — proxy: **sustained daily logging across the first two weeks** without abandonment. [ASSUMPTION]
- Weak-network logging still succeeds via the cached instant-path.

Product/quality signals:

- Nutrition values are traceable to a source or clearly marked as estimated with confidence.
- Zero instances of medical advice or unwarned dangerous targets.

Business metrics (revenue, growth, monetization) are intentionally deferred to a future phase — v1 is validated on user-success and quality signals, with business KPIs defined once product-market fit is demonstrated.

## Scope

**In (MVP v1 — Must):**

- User profile creation (feeds BMR/TDEE targets and the whole dashboard) — the first build move
- AI natural-language food logging pipeline (parse → decompose → DB match → clarifying chip → confirm/edit → save)
- Curated Sri Lankan nutrition DB as source of truth + AI-estimated fallback (labeled + confidence)
- Calorie burn: auto baseline (BMR + activity, formula shown) + manual workout entry
- Net-calorie dashboard (nudge-not-nag)
- Source citations + loading hints; cached instant-path offline fallback
- Full safety ladder (green/yellow/red consent) + "no medical advice" guardrails
- Email auth, protected routes, per-user data isolation, account deletion
- Responsive PWA (Android tablet, iPhone, laptop)

**Deferred (Should — next):** body/weight progress + trend charts; AI daily reflection; weekly report; photo food recognition; daily health check-in (sleep/mood/water/steps).

**Later (Could):** barcode scanning; voice food logging; meal planning / grocery / recipe nutrition.

**Explicitly out (Won't this time):** heavy manual food-search / saved-meals / custom-foods UI; wearables; coach/nutritionist portal; multilingual/Sinhala; gamification. *(The lightweight confirm/edit-before-save step is kept — only the heavy manual search UI is cut.)*

## Vision

If it succeeds, FitMind AI grows from an accurate tracker into a genuine personal health assistant: a supportive daily reflection and weekly-report layer, photo-based logging, richer body and habit tracking, and eventually coach/nutritionist collaboration and multilingual (including Sinhala) support — expanding across South Asian cuisines where mainstream trackers fail. The through-line never changes: **trustworthy numbers first, gentle guidance second, never guilt.**
