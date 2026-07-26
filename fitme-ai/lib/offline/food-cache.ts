/**
 * Client-side food cache helpers (Story 4.1 / AD-12).
 * Pure storage key + merge logic — usable from tests without a browser.
 */

import type {
  CachedFood,
  OfflineCatalogPayload,
  OfflineParseQueueItem,
  OfflineQueueItem,
} from "@/lib/offline/types";

export const OFFLINE_CATALOG_KEY = "fitme.offline.catalog.v1";
export const OFFLINE_WRITE_QUEUE_KEY = "fitme.offline.writeQueue.v1";
export const OFFLINE_PARSE_QUEUE_KEY = "fitme.offline.parseQueue.v1";

const MAX_FOODS = 80;
const MAX_QUEUE = 50;

export function mergeCatalogFoods(
  existing: CachedFood[],
  incoming: CachedFood[],
): CachedFood[] {
  const bySlug = new Map<string, CachedFood>();
  for (const f of existing) bySlug.set(f.slug, f);
  for (const f of incoming) bySlug.set(f.slug, f);
  return [...bySlug.values()].slice(0, MAX_FOODS);
}

export function sortCachedFoods(
  foods: CachedFood[],
  recentSlugs: string[],
): CachedFood[] {
  const rank = new Map(recentSlugs.map((s, i) => [s, i]));
  return [...foods].sort((a, b) => {
    const ra = rank.has(a.slug) ? rank.get(a.slug)! : 999;
    const rb = rank.has(b.slug) ? rank.get(b.slug)! : 999;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

export function enqueueWrite(
  queue: OfflineQueueItem[],
  item: OfflineQueueItem,
): OfflineQueueItem[] {
  const withoutDup = queue.filter((q) => q.clientKey !== item.clientKey);
  return [...withoutDup, item].slice(-MAX_QUEUE);
}

export function enqueueParse(
  queue: OfflineParseQueueItem[],
  item: OfflineParseQueueItem,
): OfflineParseQueueItem[] {
  const withoutDup = queue.filter((q) => q.clientKey !== item.clientKey);
  return [...withoutDup, item].slice(-MAX_QUEUE);
}

export function parseCatalogPayload(raw: string | null): OfflineCatalogPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as OfflineCatalogPayload;
    if (!Array.isArray(data.foods)) return null;
    return data;
  } catch {
    return null;
  }
}

export function newClientKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ck_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
