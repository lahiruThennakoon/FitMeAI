---
name: FitMe AI — Appearance
status: final
sources:
  - _bmad-output/planning-artifacts/ux-gap-backlog.md
  - fitme-ai/app/globals.css
  - fitme-ai/app/(app)/settings/display-preferences-form.tsx
updated: 2026-07-30
---

# FitMe AI — Appearance Experience Spine

> User-controlled light / dark / system appearance. Paired with `DESIGN.md` in this folder. Implements the gap left by OS-only `prefers-color-scheme` today.

## Foundation

Web app (Next.js), mobile-first single column. Existing Tailwind `dark:` variants + CSS variables in `globals.css`. **UI delta:** class-based theme on `<html>` (`light` | `dark` | `system`) replacing media-query-only dark. `DESIGN.md` owns tokens; this spine owns behavior.

Form-factor: phone primary; desktop uses same Settings layout (max-width shell unchanged).

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Settings → Display | Home footer · Profile link · `/settings` | Units, timezone, **Appearance** |
| (all app surfaces) | — | Reflect chosen theme instantly |

Appearance is **not** on the Profile & targets form (`/goals`). It sits beside Units & timezone in Settings — same mental bucket as "how things look and read."

### Appearance control (MVP)

```
Settings
└── Display
    ├── Units (metric / imperial)
    ├── Glucose display unit
    ├── Timezone
    └── Appearance          ← NEW
        ○ Match system
        ○ Light
        ○ Dark
```

Phase 2: add **Night** under Appearance or as fourth segment.

## Voice and Tone

| Do | Don't |
|---|---|
| "Match system" | "Auto" (ambiguous) |
| "Light" / "Dark" | "Day mode" / "Night mode" (Night is phase 2 name) |
| "Charts and macro colors keep the same meaning in every mode." | "Pick your favorite colors!" |
| Silent apply — no toast on every toggle | "Theme saved successfully!!!" |

## Component Patterns

| Component | Use | Behavioral rules |
|---|---|---|
| Appearance segments | Settings → Display | Single-select. Tap applies immediately. No separate Save button for theme alone. |
| Theme provider | Root layout | Reads localStorage on load; listens to `system` via `matchMedia`. Sets `class="dark"` on `<html>` when effective theme is dark. |
| Profile sync | Signed-in users | On change, PATCH profile `appearancePreference`; on login, profile wins if newer than local. |
| FOUC script | `<head>` inline | Runs before body paint; reads localStorage key `fitme-appearance`. |

### Persistence keys

| Store | Key | Values |
|---|---|---|
| localStorage | `fitme-appearance` | `system` \| `light` \| `dark` |
| UserProfile (migration) | `appearancePreference` | same enum, nullable → default `system` |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| First visit | All | `system` — follow OS until user chooses |
| Signed in, no profile yet | Settings → Display | Appearance still works via localStorage; other display fields show profile nudge |
| OS changes while on System | All | Live update via `prefers-color-scheme` listener |
| Offline | Settings | localStorage only; sync on reconnect |
| Invalid stored value | All | Fall back to `system` |

## Interaction Primitives

1. **Instant apply** — selecting a segment updates `<html>` class before network round-trip.
2. **No confirmation** — switching Light ↔ Dark is reversible; not destructive.
3. **Semantic stability** — macro over-target red slice, water green, glucose glance colors: unchanged across themes (only neutral surfaces shift).

## Accessibility Floor

- Segmented control: `role="radiogroup"`, each segment `role="radio"` + `aria-checked`.
- Contrast: Light and Dark must meet WCAG AA for body text on `{surface-base}`; Night must not drop below AA on primary ink.
- Respect `prefers-reduced-motion`: theme switch is instant (no cross-fade animation in MVP).
- Do not rely on color alone for macro state — existing `%` and `aria-valuetext` preserved.

## Key Flows

### Flow 1 — Priya switches to Dark before bed

1. Priya opens **Settings** from Home footer.
2. Scrolls to **Display** → **Appearance**.
3. Taps **Dark**. Screen updates immediately; no Save tap.
4. Navigates to **Dashboard** — fasting chip and macro bars already dark.
5. **Climax:** She logs a glucose reading at 11pm without a white flash or squinting at a light card.

### Flow 2 — New user on light phone wants FitMe always light

1. Alex registers; app opens in **System** (phone is light).
2. Goes to Settings → Appearance → **Light**.
3. Later switches phone to dark OS — FitMe stays light because choice overrides system.
4. **Climax:** Lunch logging stays bright and readable regardless of OS setting.

### Flow 3 — Phase 2 Night (future)

1. Same as Flow 1 but selects **Night** instead of Dark.
2. Surfaces warm; brand links slightly desaturated.
3. **Climax:** Bedside fast timer readable without feeling like a flashlight.

## Responsive & Platform

- Segmented control: full width on narrow screens; max ~320px centered on tablet/desktop.
- PWA `theme-color` meta updates with effective theme (brand blue light, dark surface dark).
- Auth pages (`/login`, `/register`) inherit root theme — no separate auth skin.

## Inspiration & Anti-patterns

**Inspire:** iOS Settings → Appearance; Linear's system/light/dark; calm health apps that don't gamify theme choice.

**Anti-patterns:**
- Fortnite-style color themes that break macro meaning
- Auto dark mode at sunset without asking (surprises mid-log)
- Burying appearance in Profile with BMR fields
- Flash of white on load for dark users

## Open Questions (non-blocking)

| Item | Default if unresolved |
|---|---|
| Night as 4th segment vs toggle under Dark | 4th segment in phase 2 |
| Profile field name | `appearancePreference` |
| Conflict resolution local vs profile | Profile wins on login; last-write-wins after |

## Handoff

**Architecture:** `next-themes` or thin `ThemeProvider`; migrate `globals.css` from `@media (prefers-color-scheme)` to `.dark` / `.light` class tokens; Prisma field + migration.

**Stories (suggested):**
1. Theme provider + FOUC guard + localStorage
2. Settings Appearance UI + instant apply
3. Profile sync + migration
4. (Phase 2) Night token set + QA contrast pass

**Next skills:** `bmad-architecture` (AD for theme class strategy), `bmad-create-epics-and-stories`, then `bmad-dev-story`.
