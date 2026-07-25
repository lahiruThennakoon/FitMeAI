---
baseline_commit: bbe22deb711a24e1fabae58d1c1ddcede26ed7b4
---

# Story 1.6: Create/edit profile & compute targets

Status: review

## Story

As a new user,
I want to enter my details and get suggested daily targets with the formula shown,
so that I have personalized, transparent goals I can trust or adjust.

## Acceptance Criteria

1. Profile fields accepted; implausible inputs rejected
2. Suggested targets via Mifflin-St Jeor BMR + documented heuristics; formula + disclaimer visible
3. Weight/activity changes recompute suggestions; overrides allowed
4. Canonical units (g, kcal, cm) stored; preferred units for display (AD-11)
5. Timezone persisted for day boundaries (AD-10)
6. A11y + supportive UX; no safety ladder (Story 1.7)

## Tasks / Subtasks

- [x] Task 1: Domain units + BMR/TDEE + suggest-targets (pure)
- [x] Task 2: Prisma UserProfile + Goal + migration
- [x] Task 3: Schemas, DAL, saveProfileAction / previewTargetsAction
- [x] Task 4: Goals UI with formula transparency + dashboard link
- [x] Task 5: Tests (78 passing) + story → review

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- Mifflin–St Jeor BMR + standard activity multipliers; calorie delta by goal type
- Live client recompute on weight/activity change; calorie override supported
- Canonical persistence via DAL; metric/imperial conversion at edges
- Safety ladder intentionally deferred to Story 1.7
- Apply migration when Postgres is up: `npm run db:migrate`

### File List

- fitme-ai/lib/domain/targets/units.ts
- fitme-ai/lib/domain/targets/bmr.ts
- fitme-ai/lib/domain/targets/suggest-targets.ts
- fitme-ai/lib/domain/targets/types.ts
- fitme-ai/lib/schemas/profile.ts
- fitme-ai/lib/dal/profile.ts
- fitme-ai/app/actions/profile.ts
- fitme-ai/app/(app)/goals/page.tsx
- fitme-ai/app/(app)/goals/goals-form.tsx
- fitme-ai/app/(app)/dashboard/page.tsx
- fitme-ai/prisma/schema.prisma
- fitme-ai/prisma/migrations/20260725140000_profile_goal/migration.sql
- fitme-ai/tests/units.test.ts
- fitme-ai/tests/bmr-tdee.test.ts
- fitme-ai/tests/profile-schema.test.ts
- fitme-ai/tests/save-profile-action.test.ts
- fitme-ai/lib/email/send-email.ts (dev verify-link console print)
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/1-6-create-edit-profile-compute-targets.md

### Change Log

- 2026-07-25: Implemented Story 1.6 profile + target computation — status → review

### Review Findings

See consolidated Epic 1 review: [epic-1-code-review.md](./epic-1-code-review.md) (2026-07-25). Story status remains `review` pending patch/decision resolution.

