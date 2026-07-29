# UX Gap Backlog

Practical, user-perspective problems found by auditing the implemented app against
what a real user would try to do. Generated 2026-07-29 from a full sweep of the
fasting, glucose, food, exercise, water, weight, goals, progress, dashboard, and
settings modules.

This is a **prioritization input**, not a commitment. Items are grouped by the
damage they do to a user, not by effort.

Legend: `[ ]` open · `[x]` fixed · `(→ N.N)` folded into a story · `[~]` deferred

---

## Tier 0 — Bugs that lose data or show wrong information *(done 2026-07-29)*

- [x] **Offline meal descriptions silently discarded.** `components/offline-reconciler.tsx`
- [x] **mmol/L readings never displayed in mmol/L.** Profile glucose unit + formatters.
- [x] **Delete confirmation names the wrong day.** `removeScopeLabel` in day lists.
- [x] **Active fast disappears when viewing a past day.** Dashboard chip no longer gated on today.
- [x] **Timezone field claimed to be inert.** Goals form hint corrected.
- [x] **No plausibility bounds on glucose.** Schema + unit bounds.
- [x] **Parse dropped staged drafts / wrong AI attribution / fasting chip hydration.** See Tier 0 review fixes in git history.

---

## Tier 1 — Daily friction *(done 2026-07-29)*

Backdating, fasting control, undo, and destructive-action safety — all implemented.
See git history and story artifacts 6.x–7.x for detail.

---

## Tier 2 — Trust and comprehension *(done 2026-07-29)*

Remaining vs Burn clarity, eat-back-exercise, movement aims, sodium row, chart
coverage notes, baseline burn formula, goal-direction warning, rate-limit copy.

---

## Tier 3 — Missing table stakes *(done 2026-07-30)*

### Units

- [x] **Imperial height is feet + inches** — `goals-form.tsx`
- [x] **Exercise distance in mi for imperial** — exercise form + display
- [x] **Target override fields in display units** — goals form imperial labels
- [x] **Glucose unit preference on profile** — Settings + profile migration
- [x] **Units and timezone in Settings** — `display-preferences-form.tsx`

### Account and data

- [x] **Data export (JSON)** — `export-data.tsx`, `lib/dal/export.ts`
- [x] **Change password while signed in** — `change-password-form.tsx`
- [x] **Change email** — `change-email-form.tsx`
- [x] **Notification / reminder preferences** — `notification-preferences-form.tsx`
  (stored on profile; delivery not wired yet)

### History depth

- [x] **Pagination via Show more** — fasting, glucose, goals weigh-ins
- [x] **All-time + extended ranges on progress** — `lib/domain/progress/metrics.ts`
- [x] **Calorie, macro, water, exercise metrics on progress**
- [x] **Weekly/monthly chart summaries** — progress page aggregates

### Logging convenience

- [~] **Barcode scan / photo logging** — deferred (camera blocked in config; needs product spike)
- [x] **Copy yesterday's meals** — `copy-day-meals.tsx`
- [x] **Online food catalog search** — `searchFoodsByQuery`, `food-catalog-search.tsx`
- [x] **Quick-log portion picker** — servings + meal type on `instant-log.tsx`
- [~] **Named recipes independent of log entries** — deferred (needs recipe model)
- [x] **Log immediately shortcut alongside review** — `relogFoodTemplateAction`, Log chip
- [x] **Meal, weight, and fasting notes collected** — log review, weight check-in, fasting

### Offline

- [~] **Full offline for fasting/glucose/exercise/water** — deferred (instant food only today)
- [x] **Reconcile failures surfaced** — `offline-reconciler.tsx` banner + failed item list

### Onboarding

- [x] **Country optional** — profile schema + form label
- [x] **Profile setup nudge on dashboard** — `profile-setup-nudge.tsx`
- [~] **First-login redirect / registration → app flow** — deferred (auth product decision)

---

## Suggested sequencing

1. **Tier 0** — actively produces wrong data. *(done)*
2. **Backdate and correct anything** epic. *(done)*
3. **Destructive-action safety.** *(done)*
4. **Remaining vs Burn + eat-back-exercise.** *(done)*
5. **Tier 3 table stakes.** *(done 2026-07-30)*
6. **Deferred spikes:** barcode/photo logging, named recipes, full offline trackers,
   post-registration onboarding flow.
