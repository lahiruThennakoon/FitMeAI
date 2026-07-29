---
baseline_commit: 82b1540
---

# Story 6.2: Weight trend sparkline

Status: absorbed

## Story

As a user,
I want a simple weight trend,
so that progress over days is glanceable without charts overload.

## Resolution (2026-07-27)

**Absorbed by Story 9.5** — weight trend delivered as the default `time × weight` preset on `/progress` instead of a separate Profile sparkline. Avoids two chart stacks (epic-9 planning decision).

## Acceptance Criteria (original)

- ~~Profile sparkline~~ → use `/progress?x=time&y=weight`
- Copy stays supportive (no shame) — satisfied on Progress page

## See also

- `_bmad-output/implementation-artifacts/9-5-weight-trend-via-progress.md`
- `_bmad-output/planning-artifacts/epic-9-correlation-graphs.md` (Relationship to Epic 6.2)
