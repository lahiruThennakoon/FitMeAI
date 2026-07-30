---
name: FitMe AI — Appearance
description: Visual tokens for user-controlled light, dark, and night surfaces. Extends the existing FitMe brand gradient system without changing macro semantics.
status: final
updated: 2026-07-30
colors:
  # Shared brand (theme-invariant)
  brand-blue: '#2F57E3'
  brand-teal: '#0EA5A5'
  brand-green: '#22B36B'
  brand-gradient-start: '#2F57E3'
  brand-gradient-mid: '#0EA5A5'
  brand-gradient-end: '#22B36B'
  # Light
  surface-base: '#FFFFFF'
  surface-raised: '#FFFFFFB3'
  ink-primary: '#171717'
  ink-secondary: '#525252'
  ink-muted: '#737373'
  border-subtle: '#E5E5E5CC'
  # Dark
  surface-base-dark: '#0A0A0A'
  surface-raised-dark: '#17171799'
  ink-primary-dark: '#EDEDED'
  ink-secondary-dark: '#A3A3A3'
  ink-muted-dark: '#737373'
  border-subtle-dark: '#404040CC'
  brand-blue-dark: '#5B7CF0'
  # Night (phase 2 — warm, dim)
  surface-base-night: '#0C0B0A'
  surface-raised-night: '#1A1816CC'
  ink-primary-night: '#E8E4DF'
  ink-secondary-night: '#9C958C'
  ink-muted-night: '#6B6560'
  border-subtle-night: '#2A2724CC'
  brand-blue-night: '#4A6FD4'
typography:
  sans:
    fontFamily: 'Geist Sans, system-ui, sans-serif'
  mono:
    fontFamily: 'Geist Mono, ui-monospace, monospace'
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
components:
  appearance-segment:
    height: 44px
    radius: '{rounded.lg}'
    selected-bg-light: '{colors.surface-base}'
    selected-bg-dark: '{colors.surface-raised-dark}'
    track-bg-light: '{colors.border-subtle}'
    track-bg-dark: '{colors.border-subtle-dark}'
  card-surface:
    radius: '{rounded.xl}'
    border-light: '{colors.border-subtle}'
    border-dark: '{colors.border-subtle-dark}'
    padding: '{spacing.5}'
  brand-gradient-button:
    background: 'linear-gradient(120deg, {colors.brand-gradient-start}, {colors.brand-gradient-mid} 55%, {colors.brand-gradient-end})'
    radius: '{rounded.lg}'
    min-height: 44px
---

## Brand & Style

FitMe is an accuracy-first nutrition tracker — calm, trustworthy, never scolding. Appearance modes change **surfaces and ink**, not the meaning of data. Macro overage stays red, water stays green, brand gradient stays on primary actions. Themes answer one user question: *"Can I read this comfortably right now?"*

Light is for daytime logging at the kitchen counter. Dark is standard OLED-friendly evening use. **Night** (phase 2) is a warmer, dimmer variant for bedside glances during a fast — not a separate product skin.

## Colors

### Theme-invariant (never swap)

- **Brand blue / teal / green** — primary actions, macro accents, chart series identity.
- **Semantic macro hues** — calories blue, protein teal, carbs amber, fat emerald, sodium violet. Meaning beats mood.
- **Alert red / amber** — over-target macros, reconcile warnings, destructive confirm.

### Light (`surface-base`)

- Canvas `{colors.surface-base}`; cards `{colors.surface-raised}` with `{colors.border-subtle}`.
- Body `{colors.ink-primary}`; helpers `{colors.ink-secondary}`; captions `{colors.ink-muted}`.

### Dark (`surface-base-dark`)

- Cool neutral black — matches current `prefers-color-scheme` implementation.
- Brand blue lifts to `{colors.brand-blue-dark}` on text links for contrast.

### Night (`surface-base-night`) — phase 2

- Warm black `{colors.surface-base-night}`; brown-gray borders.
- Brand blue desaturated to `{colors.brand-blue-night}` (~15% less saturation) to reduce blue-light stimulation.
- Do **not** tint macro semantic colors — only neutrals and brand chrome shift.

## Typography

Inherits existing Geist stack. No type scale changes per theme. Tabular nums on all numeric readouts in every mode.

## Layout & Spacing

No layout changes per theme. Spacing scale unchanged. Settings Appearance control uses `{spacing.4}` internal padding, `{spacing.2}` gap between segments.

## Elevation & Depth

Cards use border + subtle fill (`white/70` light, `neutral-900/60` dark) — not heavy shadows. Night reduces optional glow on macro fills by 20% compared to dark.

## Shapes

Existing `{rounded.xl}` cards and `{rounded.lg}` inputs preserved. Appearance segmented control matches pill-within-track pattern (iOS Settings–like).

## Components

### Appearance segmented control

Three segments MVP: **System · Light · Dark**. Phase 2 adds **Night** as fourth segment or sub-option under Dark ("Warmer").

- Selected segment: raised surface, `{colors.ink-primary}` / dark equivalent.
- Unselected: muted ink on track background.
- Min touch target 44×44px per segment.

### Theme flash guard

Inline script in `<head>` sets `class` on `<html>` before first paint. No white flash when user chose dark on a light OS.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Keep macro/chart semantics identical across themes | Per-theme accent color packs |
| Instant preview on tap | Require Save for appearance alone |
| Offer System as default | Auto-switch by clock without opt-in |
| Use Night for warm dim bedside reading | Replace Dark entirely with Night |
| Sync preference to profile when signed in | Hide appearance inside 15-field Profile form |
