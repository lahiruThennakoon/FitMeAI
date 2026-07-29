"use client";

import {
  OFFLINE_CATALOG_KEY,
  OFFLINE_PARSE_QUEUE_KEY,
  OFFLINE_WRITE_QUEUE_KEY,
  enqueueParse,
  enqueueWrite,
  mergeCatalogFoods,
  parseCatalogPayload,
} from "@/lib/offline/food-cache";
import type {
  CachedFood,
  OfflineCatalogPayload,
  OfflineParseQueueItem,
  OfflineQueueItem,
} from "@/lib/offline/types";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota / private mode — non-fatal.
  }
}

export function loadOfflineCatalog(): OfflineCatalogPayload | null {
  if (typeof window === "undefined") return null;
  return parseCatalogPayload(window.localStorage.getItem(OFFLINE_CATALOG_KEY));
}

export function saveOfflineCatalog(payload: OfflineCatalogPayload): void {
  const prev = loadOfflineCatalog();
  const foods = mergeCatalogFoods(prev?.foods ?? [], payload.foods);
  writeJson(OFFLINE_CATALOG_KEY, {
    ...payload,
    foods,
  } satisfies OfflineCatalogPayload);
}

export function listCachedFoods(): CachedFood[] {
  return loadOfflineCatalog()?.foods ?? [];
}

export function loadWriteQueue(): OfflineQueueItem[] {
  return readJson<OfflineQueueItem[]>(OFFLINE_WRITE_QUEUE_KEY, []);
}

export function saveWriteQueue(queue: OfflineQueueItem[]): void {
  writeJson(OFFLINE_WRITE_QUEUE_KEY, queue);
}

export function appendWriteQueue(item: OfflineQueueItem): void {
  saveWriteQueue(enqueueWrite(loadWriteQueue(), item));
}

export function loadParseQueue(): OfflineParseQueueItem[] {
  return readJson<OfflineParseQueueItem[]>(OFFLINE_PARSE_QUEUE_KEY, []);
}

export function saveParseQueue(queue: OfflineParseQueueItem[]): void {
  writeJson(OFFLINE_PARSE_QUEUE_KEY, queue);
}

export function appendParseQueue(item: OfflineParseQueueItem): void {
  saveParseQueue(enqueueParse(loadParseQueue(), item));
}

/** Fired when queued offline parses become available to the log form. */
export const PARSE_QUEUE_EVENT = "fitme:resume-parse";

export function removeParseQueueItem(clientKey: string): void {
  saveParseQueue(loadParseQueue().filter((i) => i.clientKey !== clientKey));
}

export function isBrowserOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine === false;
}
