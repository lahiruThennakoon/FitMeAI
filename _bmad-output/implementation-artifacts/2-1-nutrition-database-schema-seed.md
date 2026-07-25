---
baseline_commit: 28c744a062d70ada1717400e7bd615da4138b69f
---

# Story 2.1: Nutrition database schema & Sri Lankan seed data

Status: review

## Story

As a user,
I want the app to know common Sri Lankan foods and their ingredients,
so that my everyday meals produce accurate, sourced nutrition.

## Acceptance Criteria

1. Migrated schema: Food, Ingredient, FoodServing, RecipeIngredient with indexes, timestamps, canonical units (g, kcal, mg) (AD-3, AD-11)
2. Lookup of seeded foods (pol sambol, dhal curry, rice) returns ingredient-level nutrition with `dataSource = database`
3. Seed includes PRD/brief Sri Lankan staples; hybrid provenance (USDA-style open data + hand-curated dish proportions); missing macros are `null` (never fabricated)
4. Duplicate foods de-duplicated (unique slug); composite foods resolve to ingredients; bottom-up totals tested

## Tasks / Subtasks

- [x] Task 1: Prisma models + migration
- [x] Task 2: Domain compose + DTOs with provenance
- [x] Task 3: Seed script + Sri Lankan catalog
- [x] Task 4: DAL lookup + tests
- [x] Task 5: README + story → review

## Dev Notes

- FoodEntry / logging UI are later stories — this story is the catalog data layer only.
- CI has no Postgres: prefer unit tests over live DB integration; seed can run via `npm run db:seed` locally.
- Canonical nutrition on Ingredient is per 100 g; recipe rows store grams of each ingredient in the food’s default yield.
- Seed runs as plain Node (`prisma/seed.mjs` + `catalog-data.json`) so local installs do not require `tsx`.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (Amelia)

### Completion Notes List

- Prisma `Ingredient` / `Food` / `FoodServing` / `RecipeIngredient` + `FoodKind` with unique slugs and indexes
- Domain compose scales per-100g macros; null macros stay null through sums; catalog DTO stamps `dataSource: "database"`
- Hybrid Sri Lankan seed (16 ingredients, 10 foods) including rice, pol sambol, dhal curry
- DAL `findFoodBySlugOrAlias` + unit tests for compose + seed integrity (131 tests green)
- README documents migrate + seed; local migrate deploy + seed verified

### File List

- fitme-ai/prisma/schema.prisma
- fitme-ai/prisma/migrations/20260726010000_nutrition_catalog/migration.sql
- fitme-ai/prisma/migrations/20260726020000_nutrition_positive_grams/migration.sql
- fitme-ai/prisma/seed.mjs
- fitme-ai/prisma/seed/catalog.ts
- fitme-ai/prisma/seed/catalog-data.json
- fitme-ai/lib/domain/nutrition/types.ts
- fitme-ai/lib/domain/nutrition/compose.ts
- fitme-ai/lib/domain/nutrition/food-detail.ts
- fitme-ai/lib/dal/nutrition.ts
- fitme-ai/tests/nutrition-compose.test.ts
- fitme-ai/package.json
- fitme-ai/README.md
- _bmad-output/implementation-artifacts/2-1-nutrition-database-schema-seed.md

### Change Log

- 2026-07-26: Implemented Story 2.1 nutrition catalog schema + Sri Lankan seed — status → review
- 2026-07-26: Code review patches — transactional seed + positive-grams CHECK constraints

### Review Findings

- [x] [Review][Patch] Wrap catalog reseed in a Prisma transaction [`fitme-ai/prisma/seed.mjs`]
- [x] [Review][Patch] Enforce positive gram values (DB CHECK + seed validation) [`fitme-ai/prisma/migrations/20260726020000_nutrition_positive_grams`]
- [x] [Review][Defer] Alias collisions still possible in a larger catalog; lookup is now slug-ordered for determinism — unique alias index deferred until search/alias story
