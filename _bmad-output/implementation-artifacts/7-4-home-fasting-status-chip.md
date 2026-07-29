---
baseline_commit: 82b1540
---

# Story 7.4: Home glance — fasting status chip

Status: review

## Story

As a user with an active fast,
I want a glanceable status on Home,
so that I see my fast without opening the timer page.

## Acceptance Criteria

1. **Given** I have an active fast and Home shows today, **when** I open `/dashboard`, **then** I see a fasting status chip with live elapsed time.
2. **Given** the fast has a planned duration, **when** the chip renders, **then** it shows planned-window progress (same as `/fasting`).
3. **Given** I tap the chip, **when** navigated, **then** I land on `/fasting`.
4. **Given** no active fast or viewing yesterday, **when** on Home, **then** the chip is hidden.
5. Home nav retains “Fasting timer” link.

## Tasks / Subtasks

- [x] Task 1: Server fetch `getActiveFastingSession` on dashboard
- [x] Task 2: Client `FastingStatusChip` with live timer + link
- [x] Task 3: Show only when `isToday` → review

## Dev Agent Record

### File List

- fitme-ai/app/(app)/dashboard/page.tsx
- fitme-ai/app/(app)/dashboard/fasting-status-chip.tsx

### Change Log

- 2026-07-27: Implemented Story 7.4 Home fasting chip — status → review

## Verification

- Manual: active fast → chip on Home today; yesterday view hides chip
