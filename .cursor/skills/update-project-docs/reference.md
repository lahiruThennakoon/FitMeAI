# FitMe AI — Documentation Map

Quick reference for the **update-project-docs** skill.

## Repository layout

```text
FitMe_AI/
├── _bmad-output/
│   ├── planning-artifacts/
│   │   ├── prds/prd-FitMe_AI-2026-07-20/prd.md      # Functional requirements (FR-*)
│   │   ├── architecture/.../ARCHITECTURE-SPINE.md   # AD-1…AD-13 invariants
│   │   ├── epics.md                                 # Master epic + story index
│   │   ├── epic-{N}-*.md                            # Per-epic detail shards
│   │   └── briefs/.../brief.md                      # Product brief (rarely changes post-MVP)
│   └── implementation-artifacts/
│       ├── {N}-{M}-{slug}.md                        # Per-story implementation record
│       └── deferred-work.md                         # Cross-story deferrals
├── fitme-ai/
│   ├── README.md                                    # Dev setup, stack, scripts
│   └── docs/
│       └── FEATURES-AND-AI-INTEGRATION.md           # Feature catalog + AI flows
└── .cursor/skills/
    ├── start-demo-environment/SKILL.md
    └── update-project-docs/SKILL.md                 # This skill
```

## Story artifact template (sections)

Use existing files under `implementation-artifacts/` as the canonical shape:

| Section | Purpose |
|---------|---------|
| YAML frontmatter | Optional `baseline_commit` |
| `# Story N.M: Title` | User story title |
| `Status:` | `review`, `done`, `in-progress` |
| `## Acceptance Criteria` | Given/When/Then — update only if product owner changed scope |
| `## Tasks / Subtasks` | Checkboxes — mark `[x]` when done |
| `## Dev Notes` | Constraints, links to AD/FR |
| `## Dev Agent Record` | Model, completion notes, file list, change log |
| `## Review Findings` | `[Review][Patch/Defer/Resolved]` items |

## FR → Epic mapping (from epics.md)

| FR range | Epic | Topic |
|----------|------|-------|
| FR-1–5, 30–31 | 1 | Auth, profile, targets, safety |
| FR-6–12, 17–20 | 2 | Food logging + AI |
| FR-13–15 | 3 | Burn, exercise, dashboard |
| FR-16 | 4 | Offline PWA |
| — | 5 | Daily habit loop |
| — | 6 | Body progress / weight |
| — | 7 | Fasting |
| — | 8 | Glucose |
| — | 9 | Progress charts |

When a change maps to an FR, cite it in the story Change Log.

## Architecture decisions (AD) — when to edit spine

| AD | Topic | Example trigger |
|----|-------|-----------------|
| AD-1 | DAL-only data access | New DAL module pattern |
| AD-2 | Zod server actions | New action category |
| AD-3 | Catalog source of truth | Nutrition provenance rule change |
| AD-4 | AI provider port | New provider adapter |
| AD-5 | AI guardrails | Guardrail rule change |
| AD-6 | Better Auth sessions | Auth flow change |
| AD-7–8 | User ownership, soft-delete | New entity ownership |
| AD-9 | Redacted logging | Log field policy |
| AD-10 | Timezone day bounds | Day selection logic |
| AD-11 | Canonical units | Storage unit change |
| AD-12 | Offline reconcile | Queue semantics |
| AD-13 | Result envelope | API response shape |

## Significance rubric

| Signal | Min docs to update |
|--------|-------------------|
| 1–3 files, bugfix, same AC | Story changelog only |
| New component + tests, same epic | Story artifact + file list |
| New epic story complete | Story + epic shard |
| Product rule users will notice | Story + app docs; PRD if FR wording wrong |
| Schema migration | Story + architecture entity section |
| New env var required | README + `.env.example` comment (not skill secrets) |

## Changelog one-liner format

```text
- YYYY-MM-DD: <verb> <what> — <optional FR/story ref>
```

Examples:

```text
- 2026-07-29: Fixed dashboard date-nav grid stability — Story 5.4 follow-up
- 2026-07-29: Shared email validation on login/register — FR-1, Stories 1.2/1.3
- 2026-07-27: Epic 8 glucose tracker shipped — Stories 8.1–8.4
```

## What not to edit

- `*.memlog.md` — BMAD internal session logs
- `brainstorm-*` — historical ideation only
- Committed `.env` — never document real secrets in markdown

## Cross-links agents should preserve

When updating a story, keep **References** bullets pointing to:

- Epic shard section (`epic-N-*.md §N.M`)
- `epics.md` story entry
- `ARCHITECTURE-SPINE.md` AD ids when relevant
- `prd.md` FR ids when relevant
