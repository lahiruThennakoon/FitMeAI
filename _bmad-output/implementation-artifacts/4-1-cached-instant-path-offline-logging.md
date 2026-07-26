---
baseline_commit: 93bde9f
---

# Story 4.1: Cached instant-path offline logging

Status: done

## Story

As a user on a weak connection,
I want to log recent/known foods instantly without waiting for AI,
so that a bad signal never blocks my daily habit.

## Acceptance Criteria

1. Offline/weak network → log cached DB food with no AI (FR-16, AD-12)
2. Catalog + recent foods cached client-side
3. Cache miss → clear messaging / wait until online

## Tasks / Subtasks

- [x] Task 1: Offline catalog API + localStorage cache helpers
- [x] Task 2: InstantLog UI + saveInstantFoodAction
- [x] Task 3: SW cache for catalog; tests + README

## Dev Agent Record

### Completion Notes List

- `/api/offline/catalog`, InstantLog chips, offline queue on failure
- Service worker cache-first for catalog

### File List

- fitme-ai/lib/offline/*
- fitme-ai/app/api/offline/catalog/route.ts
- fitme-ai/app/(app)/log/instant-log.tsx
- fitme-ai/app/actions/offline.ts
- fitme-ai/public/sw.js

### Change Log

- 2026-07-26: Implemented Story 4.1 — status → done

### Review Findings

- [x] [Review][Defer] IndexedDB for large catalogs — localStorage sufficient for MVP staple set
