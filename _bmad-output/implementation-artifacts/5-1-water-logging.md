---
baseline_commit: d70f180
---

# Story 5.1: Water logging

Status: review

## Story

As a user,
I want to log water against my daily aim,
so that Home shows real progress, not a placeholder.

## Acceptance Criteria

1. **Given** I have a water target (from Goal) or none set, **when** I add water via quick amounts (e.g. 250 ml / 500 ml) or a custom ml value, **then** a `WaterEntry` is saved for today (FR-15 water).
2. **Given** I have logged water today, **when** I open Home, **then** the Water card shows `consumed of target` with a progress indicator instead of the current static "Set a water target…" copy.
3. **Given** I have no Goal (`waterMlTarget` is null), **when** I log water, **then** it still saves and displays against a soft default aim (e.g. 2000 ml) labelled clearly as an estimate/default — never blocks logging.
4. **Given** I log water, **when** totals are computed, **then** they use the profile-timezone day boundary (AD-10) — same pattern as `zonedDayBounds` / `isWithinDay` used for food and exercise.
5. **Given** water consumed exceeds target, **when** shown on Home, **then** it uses a red **↑** deviation mark next to the number (no shame copy) — reuse `DeviationMark`/`deviationKind` from `app/(app)/dashboard/deviation-mark.tsx`.
6. **Given** I am not the owner of a `WaterEntry`, **when** any DAL/action call is attempted, **then** it is rejected (isolation via `assertOwnership`, same as `ExerciseEntry`).
7. Preferred units (`ml` vs `fl oz`) are respected for *display* only; canonical storage stays `ml` (AD-11), using `displayWater` / existing unit helpers.
8. Water amounts follow the calm/no-guilt tone (UX-DR2) — no "you failed to drink enough" copy.

## Tasks / Subtasks

- [x] Task 1: Prisma `WaterEntry` model + migration
  - [x] Add `WaterEntry` model (see Dev Notes → Data model) to `fitme-ai/prisma/schema.prisma`
  - [x] Add relation on `User.waterEntries`
  - [x] Generate migration: `npx prisma migrate dev --name water_entry`
  - [x] Run `npx prisma generate`
- [x] Task 2: DAL — `fitme-ai/lib/dal/water-entry.ts`
  - [x] `createWaterEntry(input)` — mirrors `createExerciseEntry` shape/pattern in `lib/dal/exercise-entry.ts`
  - [x] `sumWaterMlForUserBetween(userId, from, to)` — mirrors `sumExerciseKcalForUserBetween`
  - [x] `softDeleteWaterEntry(userId, id)` — mirrors exercise soft-delete (kept for parity/tests; UI delete deferred, see below)
  - [x] Use `assertOwnership` from `lib/dal/guards.ts`
- [x] Task 3: Zod schema — `fitme-ai/lib/schemas/water.ts`
  - [x] `saveWaterEntrySchema`: `amountMl: z.number().int().positive().max(5000)`, optional `loggedAt: z.string().datetime()`
- [x] Task 4: Server action — `fitme-ai/app/actions/water.ts`
  - [x] `saveWaterEntryAction(input, deps)` — mirrors `saveExerciseEntryAction` structure
- [x] Task 5: Domain — soft default aim
  - [x] Added `DEFAULT_WATER_ML_TARGET = 2000` in `lib/domain/dashboard/daily-summary.ts` (co-located, same file as `sugarLimitFromCalories`)
- [x] Task 6: Wire into `buildDailySummary`
  - [x] Extended `DailySummary` with `waterMlConsumed: number`, `waterMlTarget: number` (now always resolved — falls back to default), `waterMlTargetIsDefault: boolean`
  - [x] `buildDailySummary` input gains optional `waterMlConsumed?: number`
- [x] Task 7: Dashboard wiring — `fitme-ai/app/(app)/dashboard/page.tsx`
  - [x] Call `sumWaterMlForUserBetween(userId, bounds.start, bounds.end)` alongside the existing exercise sum (parallelized with `Promise.all`)
  - [x] Pass into `buildDailySummary`
- [x] Task 8: Water card UI — `fitme-ai/app/(app)/dashboard/daily-summary-panel.tsx`
  - [x] Replaced the static Water block with a progress card: consumed/target text, progress bar, red `DeviationMark` (`alert`) when over target, default-aim note when applicable
  - [x] Added quick-log controls in a new client component `water-log-control.tsx` (250 ml / 500 ml buttons + custom ml input), calling `saveWaterEntryAction`
  - [x] After logging, `router.refresh()` — same pattern as `ExerciseForm`/`InstantLog`
- [x] Task 9: Tests
  - [x] `tests/water-entry-dal.test.ts` — create/list/sum/soft-delete, ownership rejection (mocked `@/lib/db`, matching existing DAL test convention e.g. `instant-food-dal.test.ts`)
  - [x] `tests/water-schema.test.ts` — valid/invalid amounts
  - [x] `tests/save-water-action.test.ts` — mirrors `save-exercise-action.test.ts` pattern
  - [x] Updated `tests/daily-summary.test.ts` — `waterMlConsumed` flows through; default target + `waterMlTargetIsDefault` when Goal absent
  - [x] Updated `tests/daily-summary-panel.test.ts` — water card markup, over-target alert mark, default-aim label; mocked `water-log-control` (see Dev Agent Record → Completion Notes for why)
- [x] Task 10: README + this story → review
  - [x] Added Story 5.1 section to `fitme-ai/README.md`
  - [x] Ready for `bmad-code-review` (per workspace rule) before marking done

## Dev Notes

### Data model (add to `fitme-ai/prisma/schema.prisma`, near `ExerciseEntry`)

```prisma
// ---------------------------------------------------------------------------
// Water entries (Story 5.1 / FR-15 water) — soft-delete, canonical ml (AD-11)
// ---------------------------------------------------------------------------

model WaterEntry {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  amountMl  Int
  loggedAt  DateTime
  /// Soft-delete (AD-8). Null = active.
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([userId, loggedAt])
  @@index([userId, deletedAt])
  @@map("water_entry")
}
```

Add `waterEntries WaterEntry[]` to `User` model alongside `exerciseEntries`.

**Naming/shape rationale:** deliberately mirrors `ExerciseEntry` 1:1 (userId, single value column, `loggedAt`/`performedAt` equivalent, `deletedAt`, same two indexes) so the dev agent can copy the exercise DAL/action pattern almost verbatim instead of inventing a new shape. Don't add a separate `WaterTarget` table — the target already lives on `Goal.waterMl`; only a **display-time** default (constant) is needed when no Goal exists.

### Current code this story touches (read before editing)

- `fitme-ai/lib/domain/dashboard/daily-summary.ts` — `DailySummary.waterMlTarget` already exists (line ~53, populated at line ~271 from `input.goal?.waterMl ?? null`). This story adds `waterMlConsumed` and a soft default target fallback. Do **not** rename `waterMlTarget` — other code/tests may reference it.
- `fitme-ai/app/(app)/dashboard/daily-summary-panel.tsx` — the Water section is the **last block** in `DailySummaryPanel`, currently:
  ```tsx
  <div className="rounded-xl border border-sky-200/60 bg-sky-50/70 px-3 py-3 dark:border-sky-900/50 dark:bg-sky-950/25">
    <p className="text-sm font-medium text-sky-900 dark:text-sky-100">Water</p>
    <p className="mt-1 text-sm text-sky-900/80 dark:text-sky-200/80">
      {summary.waterMlTarget != null
        ? `Target ${summary.waterMlTarget} ml · logging water lands next — this is your daily aim.`
        : "Set a water target in Profile when you like."}
    </p>
  </div>
  ```
  Replace this whole block; keep the sky color family for continuity with the rest of the file's brand palette (blue/teal/green/sky/amber already established — see `MACRO_THEME` and `remainingTone` in the same file for the established color-by-meaning convention).
- `fitme-ai/app/(app)/dashboard/deviation-mark.tsx` — reuse `DeviationMark` (`kind`, `alert` prop) exactly as done for macro overages (`isOver` pattern in `ProgressBar` in the same panel file) and for the energy ring in `energy-balance-chart.tsx`. Do not invent a new arrow convention.
- `fitme-ai/app/(app)/dashboard/page.tsx` — currently sums `todayExerciseKcal` via `sumExerciseKcalForUserBetween` before calling `buildDailySummary`; add the water sum the same way, same `bounds` object (already computed once per request).
- `fitme-ai/lib/domain/targets/units.ts` — has `displayWater(ml, units)`, `flOzToMl`/`mlToFlOz`. Use these for any user-facing unit conversion; keep all storage/DAL/action values in ml (canonical, AD-11).

### Patterns to copy directly

- **DAL**: `fitme-ai/lib/dal/exercise-entry.ts` (full file read above) — same create/sum/soft-delete trio, same `assertOwnership` usage, same DTO-mapping style.
- **Action**: `fitme-ai/app/actions/exercise.ts` — same `requireSession` → zod `safeParse` → `err`/`ok` `Result` envelope → `logger.info`/`logger.error` with `{ event, ... }` shape (never log free-text; a plain `amountMl` number is fine, it's not PII/health-sensitive per FR-31, unlike meal text).
- **Zod schema**: `fitme-ai/lib/schemas/exercise.ts` — same `.object({...})` + `safeParse` pattern; water is simpler (no `superRefine` needed since there's no conditional field like `customLabel`).
- **Day bounds**: `fitme-ai/lib/domain/dashboard/day-bounds.ts` — reuse `zonedDayBounds`/`isWithinDay` if you need per-day filtering client-side; for the dashboard sum, `sumWaterMlForUserBetween(userId, bounds.start, bounds.end)` (Prisma-side range query, same as exercise) is sufficient and matches AD-10.
- **Client logging control**: `fitme-ai/app/(app)/log/instant-log.tsx` and `fitme-ai/app/(app)/exercise/exercise-form.tsx` — both show the `"use client"` + `useTransition` + server action + `router.refresh()` pattern to follow for the new water quick-log control.

### Tone / UX guardrails (carry over from the dashboard polish work)

- No "deficit"-style or shame language. If water is under target, this is neutral/positive info, not a failure state.
- Only use the red **alert** arrow (`DeviationMark` with `alert`) when **over** a limit — same as sugar/fat macro overages and the energy-over-burn state. Under target = no red mark, optionally a neutral/positive tone consistent with existing green="good" convention used elsewhere (`brand-green` for "room left"/"under" in `EnergyBalanceChart`/`ProgressBar`).
- Keep numbers in whole ml (or converted display units) — don't introduce decimals users have to parse.

### Testing requirements

- Follow existing Vitest patterns (`renderToStaticMarkup` + `createElement` for component tests, plain unit tests for DAL/domain, `deps` injection for actions — see `tests/save-exercise-action.test.ts` for the exact mocking shape to copy).
- Run: `npx vitest run tests/water-entry-dal.test.ts tests/water-schema.test.ts tests/save-water-action.test.ts tests/daily-summary.test.ts tests/daily-summary-panel.test.ts` before marking done, plus `npx tsc --noEmit` and `npm run lint` on touched files.
- After schema changes: `npx prisma generate` then `npx prisma migrate dev` (or `migrate deploy` against the local Postgres on `:5433` per project setup) — Node/dev server may need restarting afterward for file locks (known project quirk).

### Previous story intelligence (3.2 Manual exercise logging — closest analog)

- Review findings deferred soft-delete UI and profile-timezone day-boundary nuance to later polish — for water, implement the DAL soft-delete now (cheap, keeps parity) but UI delete/edit of water entries is **out of scope** for 5.1 (that's Story 5.2/5.3 territory generalized — if you want, note in Dev Agent Record that a dedicated water-edit story isn't planned yet and flag it as a defer, don't block on it).
- Estimates in that story used explicit "estimate" labeling; water amounts are *exact user input* (not an estimate), so no "estimate" labeling is needed here — don't copy that label reflexively.

## Dev Agent Record

### Agent Model Used

Cursor Sonnet 5

### Completion Notes List

- `WaterEntry` model added mirroring `ExerciseEntry` 1:1 (userId, single value column, `loggedAt`, `deletedAt`, same two indexes). Migration `20260726141727_water_entry` applied against the local `fitme-pg` Postgres.
- Prisma client generation hit a persistent Windows `EPERM` rename lock on `query_engine-windows.dll.node` (no visible locking process from this shell — likely host AV/EDR scanning). Worked around by generating once with `PRISMA_CLIENT_ENGINE_TYPE=binary` (env var only, not persisted to schema/generator block) which produced a differently-named engine file and succeeded; a valid `query_engine-windows.dll.node` (library engine) also ended up present afterward from an earlier partially-successful attempt. Verified the generated `node_modules/.prisma/client/schema.prisma` includes `WaterEntry`. If this recurs for future `prisma generate` runs on this machine, retry with `$env:PRISMA_CLIENT_ENGINE_TYPE="binary"` as a workaround.
- `DailySummary.waterMlTarget` changed from `number | null` to `number` (always resolved — falls back to `DEFAULT_WATER_ML_TARGET = 2000` when no Goal exists). Added `waterMlTargetIsDefault: boolean` so the UI can label the fallback without the type going nullable again. This is a small, intentional widening of an existing field's contract; no other code depended on the null case (grepped for `waterMlTarget` usages before changing).
- `WaterLogControl` (`"use client"`) uses `next/navigation`'s `useRouter()`, which throws `invariant expected app router to be mounted` under plain `renderToStaticMarkup` (no App Router context). Confirmed by running the test before mocking. Fixed by mocking `@/app/(app)/dashboard/water-log-control` in `daily-summary-panel.test.ts` — the panel test only asserts static markup; `WaterLogControl`'s own logic is covered by `save-water-action.test.ts` (the action layer) and TypeScript/lint checks (no dedicated jsdom interaction test was added for the client component itself — flagging as a defer, see Review Findings).
- Water amounts are exact user input, not an estimate — deliberately did not reuse exercise's "estimate" labeling convention.
- Full test suite (288 tests / 62 files), `tsc --noEmit`, and `npm run lint` all pass for touched files. One pre-existing, unrelated lint error remains in `app/(app)/log/instant-log.tsx` (`react-hooks/set-state-in-effect`) — not touched by this story, left as-is.
- Edit/delete UI for water entries is out of scope for 5.1 (DAL soft-delete helper exists for parity/tests only), matching the exercise-entry precedent from Story 3.2.

### File List

- fitme-ai/prisma/schema.prisma
- fitme-ai/prisma/migrations/20260726141727_water_entry/migration.sql
- fitme-ai/lib/dal/water-entry.ts
- fitme-ai/lib/schemas/water.ts
- fitme-ai/app/actions/water.ts
- fitme-ai/lib/domain/dashboard/daily-summary.ts
- fitme-ai/lib/domain/targets/units.ts
- fitme-ai/app/(app)/dashboard/page.tsx
- fitme-ai/app/(app)/dashboard/daily-summary-panel.tsx
- fitme-ai/components/log-toast-provider.tsx
- fitme-ai/components/app-authenticated-shell.tsx
- fitme-ai/tests/log-toast-provider.test.tsx
- fitme-ai/app/(app)/dashboard/water-log-control.tsx
- fitme-ai/tests/water-entry-dal.test.ts
- fitme-ai/tests/water-schema.test.ts
- fitme-ai/tests/save-water-action.test.ts
- fitme-ai/tests/daily-summary.test.ts
- fitme-ai/tests/daily-summary-panel.test.ts
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/5-1-water-logging.md

### Change Log

- 2026-07-30: App-wide log save toast (`LogToastProvider`) — water quick-add success/errors and delete undo now use the global snackbar above the bottom nav (cross-cutting UX; wired across all log flows)
- 2026-07-26: Implemented Story 5.1 water logging — status → review
- 2026-07-26: Adversarial self-review (Blind Hunter / Edge Case Hunter / Acceptance Auditor) caught AC7 (preferred units for water display) unimplemented in the first pass — patched: added `preferredUnits` to `DailySummary`, `parseWaterToMl` helper in `lib/domain/targets/units.ts`, wired `displayWater`/unit-aware quick-add + custom input into the water card and `WaterLogControl`. Also tightened the imperial custom-input `max` attribute (169 fl oz, not 170) so it can't exceed the 5000 ml server cap after conversion.

### Review Findings

Ran an adversarial self-review (Blind Hunter / Edge Case Hunter / Acceptance Auditor lenses) against all ACs and the diff, since no separate reviewer subagent was invoked in this session.

- [x] [Review][Patch] AC7 not implemented in first pass — water card and quick-log control ignored `profile.preferredUnits`, always showing raw ml. **Fixed**: `DailySummary.preferredUnits`, `displayWater`/`parseWaterToMl` wired through; canonical storage stays ml (AD-11); added tests (`daily-summary.test.ts`, `daily-summary-panel.test.ts`) for imperial display.
- [x] [Review][Patch] Imperial custom-input `max` (170 fl oz) could round-trip to >5000 ml, silently relying on server rejection with no clear client hint. **Fixed**: capped at 169 fl oz.
- [ ] [Review][Defer] No dedicated jsdom/interaction test for `WaterLogControl` itself (click/submit/error-message state transitions). Covered indirectly via `save-water-action.test.ts` (action layer) + `tsc`/lint, matching the existing test-coverage pattern for sibling client components (`ExerciseForm`, `InstantLog` also lack direct interaction tests in this codebase) — not a regression, but a good candidate if the project adopts `@testing-library/react` interaction tests later.
- [ ] [Review][Defer] When the server rejects an out-of-range/invalid custom amount (e.g. a pasted value bypassing the client `max`), `WaterLogControl` shows the generic `"Check the highlighted fields."` message rather than a specific one (e.g. "Keep a single log under 5000 ml"). Low-impact UX polish; `saveWaterEntryAction` already returns `fieldErrors` that could be surfaced later.
- [ ] [Review][Defer] Edit/delete UI for water entries is out of scope for 5.1 (only the DAL soft-delete helper exists, for parity/tests) — intentional, matches the Story 3.2 exercise-entry precedent. Revisit alongside Stories 5.2/5.3 if a shared "entry actions" pattern emerges.
- No [Discard] findings — nothing flagged turned out to be a false positive.
