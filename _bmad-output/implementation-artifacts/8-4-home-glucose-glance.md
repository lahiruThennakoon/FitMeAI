---
baseline_commit: 82b1540
---

# Story 8.4: Home glance — last reading

Status: review

## Story

As a user who logs glucose,
I want to see my latest reading on Home,
so that I have awareness without opening the log page.

## Acceptance Criteria

1. **Given** I have at least one glucose entry, **when** I view Home (today), **then** I see latest value, context, and measured time.
2. **Given** no readings, **when** on Home, **then** the glance card is hidden (not an empty box).
3. **Given** I tap the glance, **when** navigated, **then** I land on `/glucose`.
4. Copy includes “your logged data — not medical advice”.

## Tasks / Subtasks

- [x] Task 1: DAL `getLatestGlucoseEntry`
- [x] Task 2: `GlucoseGlance` on dashboard (today only)
- [x] Task 3: README → review

## Dev Agent Record

### File List

- fitme-ai/lib/dal/glucose-entry.ts
- fitme-ai/app/(app)/dashboard/glucose-glance.tsx
- fitme-ai/app/(app)/dashboard/page.tsx

### Change Log

- 2026-07-27: Implemented Story 8.4 Home glucose glance — status → review

## Verification

- Manual: log reading → glance appears on Home; remove all → glance hidden
