---
baseline_commit: pending
---

# Story 12.1: Multi-region catalog foundation

Status: done

## Story

As a product owner preparing FitMe for international commercial launch,
I want the nutrition catalog sharded by region with locale-aware search and AI parse hints,
so that US, European, and Indian users get relevant known foods alongside the existing Sri Lankan library.

## Acceptance Criteria

1. **Given** the seed catalog, **when** `npm run db:seed` runs, **then** ingredients merge from `ingredients.global.json` and foods load from `foods.lk.json`, `foods.us.json`, `foods.in.json`, and `foods.eu.json` with **≥90 foods** total and **≥50 ingredients**.
2. **Given** a `Food` row, **when** seeded, **then** it has `locale` ∈ `{ lk, us, in, eu, global }`.
3. **Given** a user profile with `catalogLocale = us` (or country `US`), **when** they search the catalog, **then** US foods rank above same-score LK foods.
4. **Given** a user profile locale, **when** they call `parseMealAction`, **then** the AI system prompt includes region-appropriate food examples (not hardcoded Sri Lankan only).
5. **Given** existing LK foods and AC foods (`rice`, `pol-sambol`, `dhal-curry`), **when** seed validates, **then** all pass and Sri Lankan catalog behavior is unchanged for demo user (`catalogLocale = lk`).

## Implementation Summary

- Sharded seed under `prisma/seed/catalog/`
- `Food.locale` + `UserProfile.catalogLocale` (Prisma migration)
- `lib/domain/nutrition/catalog-locale.ts` — resolve locale, search boost, AI hints
- Locale-aware `searchFoodsByQuery` and `parseMealAction`
- Starter catalogs: **22 LK**, **25 US**, **25 IN**, **20 EU** foods

## File List

- fitme-ai/prisma/schema.prisma
- fitme-ai/prisma/migrations/20260801050000_catalog_locale/migration.sql
- fitme-ai/prisma/seed/catalog/*.json
- fitme-ai/prisma/seed/catalog/load-catalog.mjs
- fitme-ai/prisma/seed/catalog.ts
- fitme-ai/prisma/seed.mjs
- fitme-ai/lib/domain/nutrition/catalog-locale.ts
- fitme-ai/lib/domain/nutrition/food-detail.ts
- fitme-ai/lib/domain/nutrition/types.ts
- fitme-ai/lib/dal/nutrition.ts
- fitme-ai/lib/ai/schemas/food-parse.ts
- fitme-ai/app/actions/catalog.ts
- fitme-ai/app/actions/log.ts
- fitme-ai/scripts/generate-regional-catalog.mjs
- fitme-ai/scripts/append-regional-ingredients.mjs
- fitme-ai/scripts/seed-demo-environment.mjs
- fitme-ai/tests/catalog-locale.test.ts
- fitme-ai/tests/nutrition-compose.test.ts
- fitme-ai/tests/nutrition-search.test.ts
- fitme-ai/tests/decompose.test.ts

## Change Log

- 2026-08-01: Story 12.1 implemented — multi-region catalog foundation.
