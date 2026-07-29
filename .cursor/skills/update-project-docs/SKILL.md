---
name: update-project-docs
description: Keeps FitMe AI planning and product docs in sync after significant code or behavior changes. Use when implementing features, fixing product logic, changing architecture, or when the user asks to document changes — updates story files, epics, PRD, architecture spine, README, and fitme-ai/docs as appropriate.
---

# Update Project Docs

After **significant** implementation work, update the relevant planning and product documents **before** declaring the task complete or offering commit/push.

Do not wait for the user to ask — documentation is part of done.

## When to apply

**Update docs when any of these are true:**

- New user-facing feature, screen, or workflow
- Changed product rules (formulas, validation, copy semantics, permissions)
- Schema / migration / API contract change
- Architecture invariant touched (AD-1…AD-13)
- Epic or story scope expanded, reduced, or absorbed elsewhere
- Demo seed, env vars, or runbook behavior changed

**Skip doc updates for:**

- Typo-only or comment-only edits
- Pure refactors with identical behavior
- Test-only changes (unless they document new AC)
- Trivial styling with no UX rule change

When unsure, treat as **significant** and update at least the story artifact + changelog.

## Workflow

Copy and track:

```
Doc update progress:
- [ ] 1. Classify change (story/epic/FR/AD scope)
- [ ] 2. Update implementation story artifact(s)
- [ ] 3. Update epic shard if epic-level status changed
- [ ] 4. Update PRD / architecture only if requirements or invariants changed
- [ ] 5. Update app docs (README, fitme-ai/docs/*)
- [ ] 6. Update deferred-work.md if scope moved
- [ ] 7. Mention doc updates in completion summary
```

### Step 1 — Classify the change

| Change type | Primary docs |
|-------------|--------------|
| Single story / bugfix with AC | `_bmad-output/implementation-artifacts/{story}.md` |
| Epic completed or revised | `_bmad-output/planning-artifacts/epic-*.md` + `epics.md` |
| New FR or changed requirement | `prd-FitMe_AI-2026-07-20/prd.md` |
| New AD / data-flow invariant | `ARCHITECTURE-SPINE.md` |
| Developer / demo / feature map | `fitme-ai/README.md`, `fitme-ai/docs/*.md` |
| Deferred or superseded work | `_bmad-output/implementation-artifacts/deferred-work.md` |

Full doc map: [reference.md](reference.md)

### Step 2 — Implementation story artifact

Path: `_bmad-output/implementation-artifacts/{epic}-{story}-{slug}.md`

Update these sections (create the file if missing, using an adjacent story as template):

1. **Status** — `review` | `done` (match team convention)
2. **Tasks / Subtasks** — check off completed items
3. **Dev Agent Record → Completion Notes** — what was built, key decisions
4. **File List** — every touched path under `fitme-ai/` and `_bmad-output/`
5. **Change Log** — dated one-liner: `YYYY-MM-DD: <summary>`
6. **Review Findings** — mark resolved items `[x] [Review][Resolved]`

If behavior **differs from original AC**, note the delta in Completion Notes (do not silently rewrite AC without calling it out).

### Step 3 — Epic shard

When a story completes or epic scope shifts, update the matching file:

- `_bmad-output/planning-artifacts/epic-{N}-*.md`
- `_bmad-output/planning-artifacts/epics.md` — story status table / FR coverage if present

Mark stories done; note absorptions (e.g. “6.2 sparkline → Epic 9.5”).

### Step 4 — PRD and architecture (only when needed)

**PRD** (`_bmad-output/planning-artifacts/prds/prd-FitMe_AI-2026-07-20/prd.md`):

- Update when a functional requirement changes, new FR added, or MVP scope changes
- Keep FR numbering consistent; add a short changelog note at section top if the PRD has no formal changelog

**Architecture spine** (`_bmad-output/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md`):

- Update when AD decisions, entity model, or cross-cutting rules change
- Do not duplicate story-level detail — link to story artifact instead

### Step 5 — Application docs

| File | Update when |
|------|-------------|
| `fitme-ai/README.md` | Setup, scripts, env vars, module list, demo flow |
| `fitme-ai/docs/FEATURES-AND-AI-INTEGRATION.md` | New feature, AI touchpoint, or architecture flow change |
| `.cursor/skills/start-demo-environment/SKILL.md` | Demo seed, credentials, or walkthrough paths change |

Keep README concise; put deep feature/AI narrative in `fitme-ai/docs/`.

### Step 6 — Deferred work

`_bmad-output/implementation-artifacts/deferred-work.md`:

- Move completed deferrals to resolved
- Add new deferrals with `[Defer]` and story reference
- Link superseded stories when scope moves between epics

## Writing rules

- **Factual** — document what was implemented, not intent
- **Traceable** — link story ↔ files ↔ FR/AD ids
- **Minimal** — smallest edit that keeps docs truthful; no wholesale rewrites
- **No secrets** — never document API keys, passwords, or `.env` values (demo creds in demo skill only)
- **Same terminology** as PRD/epics (FR-, AD-, Story N.M)

## Completion summary template

When finishing a task, include:

```markdown
## Documentation updated
- Story: `_bmad-output/implementation-artifacts/…`
- Epic/PRD/Architecture: (list or "unchanged — no FR/AD impact")
- App docs: (list or "none")
```

## Examples

**Dashboard date-nav stability fix (no new FR):**

- Update story artifact if tied to 5.4 or add note in 5.4 Change Log
- Update `fitme-ai/docs/FEATURES-AND-AI-INTEGRATION.md` only if user-facing behavior section exists
- PRD unchanged

**New glucose module (Epic 8):**

- Story artifacts 8.1–8.4 → done/review, file lists, changelogs
- `epic-8-blood-sugar-tracker.md` + `epics.md`
- README module table + demo skill walkthrough
- `FEATURES-AND-AI-INTEGRATION.md` feature catalog (AI: none)

**Auth validation hardening:**

- Story 1.2 / 1.3 artifacts — completion notes
- PRD only if FR-1 acceptance text changed
- README if setup/validation behavior documented for devs

## Additional resources

- Document locations and templates: [reference.md](reference.md)
