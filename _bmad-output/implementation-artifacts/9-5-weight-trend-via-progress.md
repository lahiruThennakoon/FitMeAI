---
baseline_commit: 82b1540
---

# Story 9.5: Weight trend via Progress (absorbs 6.2)

Status: done

## Story

As a user,
I want a weight trend without a separate chart library on Profile,
so that one charting surface covers body progress.

## Acceptance Criteria

1. **Given** Epic 9 ships `time × weight` on `/progress`, **when** a user needs a weight trend, **then** they use Progress with X=`time`, Y=`weight` (default preset).
2. **Given** Story 6.2 (Profile sparkline) was optional, **when** Epic 9 lands, **then** 6.2 is absorbed rather than duplicating chart stack.
3. README documents that weight trend lives on Progress, not Profile.

## Tasks / Subtasks

- [x] Task 1: Default `/progress` to `time × weight`
- [x] Task 2: Update README + epic-6 note (6.2 deferred/absorbed)
- [x] Task 3: No separate Profile sparkline in v1

## Dev Agent Record

### Completion Notes List

- Story 6.2 **not implemented** as Profile widget; delivered as Progress preset per epic-9 planning decision (“prefer one charting stack”).

### File List

- fitme-ai/app/(app)/progress/page.tsx
- fitme-ai/README.md
- _bmad-output/planning-artifacts/epic-6-body-progress.md
- _bmad-output/planning-artifacts/epic-9-correlation-graphs.md

### Change Log

- 2026-07-27: Absorbed Story 6.2 into Epic 9.5 — status → done

## Verification

- `/progress` default shows time × weight when data exists
