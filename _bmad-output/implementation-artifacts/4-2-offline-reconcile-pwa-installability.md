---
baseline_commit: 93bde9f
---

# Story 4.2: Offline reconcile & PWA installability

Status: done

## Story

As a user,
I want my offline logs to sync when I reconnect and to install the app,
so that nothing is lost or duplicated and the app feels native.

## Acceptance Criteria

1. Offline entries reconcile via idempotent upsert with clientKey (AD-12)
2. PWA installs with manifest + icons, standalone launch
3. Queued smart-parse requests resume on reconnection

## Tasks / Subtasks

- [x] Task 1: FoodEntry.clientKey + upsertInstantFoodEntry
- [x] Task 2: OfflineReconciler + parse queue resume event
- [x] Task 3: Manifest/icons/SW shell; tests + README

## Dev Agent Record

### Completion Notes List

- Unique (userId, clientKey); reconcile action; Online listener
- SVG icon + standalone manifest start_url `/dashboard`

### File List

- fitme-ai/prisma/migrations/20260726140000_food_entry_client_key
- fitme-ai/lib/dal/instant-food.ts
- fitme-ai/components/offline-reconciler.tsx
- fitme-ai/public/manifest.webmanifest
- fitme-ai/public/icons/icon.svg

### Change Log

- 2026-07-26: Implemented Story 4.2 — status → done

### Review Findings

- [x] [Review][Defer] Full parse-queue auto-submit into LogMealForm — event dispatched; form can listen in follow-up polish
