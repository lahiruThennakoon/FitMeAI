---
baseline_commit: 82b1540
---

# Story 7.2: Active fast UI (timer + progress)

Status: review

## Story

As a user with an active fast,
I want a live elapsed timer and optional planned-window progress,
so that I can glance at my fast without medical framing or shame.

## Acceptance Criteria

1. **Given** I have an active fast, **when** I open `/fasting`, **then** I see elapsed time updating every second.
2. **Given** I set a planned duration at start, **when** the fast is active, **then** a progress bar shows % of planned window (capped at 100%).
3. **Given** I tap End, **when** the action succeeds, **then** the timer stops and I see calm completion copy with duration.
4. Copy stays supportive — “End fast”, not “You broke your fast.”
5. Disclaimer: personal timer, not medical advice.

## Tasks / Subtasks

- [x] Task 1: Live `setInterval` timer in `FastingControl`
- [x] Task 2: Planned-duration progress bar on active fast card
- [x] Task 3: Mirror progress on Home chip (7.4 shares component pattern)
- [x] Task 4: Verify with fasting tests → review

## Dev Notes

- 7.1 shipped basic timer; 7.2 adds planned-window progress bar.
- Progress uses `plannedDurationMin` from session; optional field.

## Dev Agent Record

### Completion Notes List

- Active fast card shows live elapsed + progress bar when planned hours set.
- `FastingStatusChip` on Home reuses same progress logic for glance view.

### File List

- fitme-ai/app/(app)/fasting/fasting-control.tsx
- fitme-ai/app/(app)/dashboard/fasting-status-chip.tsx

### Change Log

- 2026-07-27: Implemented Story 7.2 active fast UI polish — status → review

## Verification

- Manual: start 16h fast → progress advances; end clears active state
- fasting tests — pass (shared with 7.1/7.3)
