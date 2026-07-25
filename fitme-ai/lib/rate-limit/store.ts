/**
 * Sliding-window hit store for rate limiting (Story 1.8 / FR-30).
 * In-memory by default — fine for single-instance / Edge isolate MVP.
 */

export type RateLimitStore = {
  /** Timestamps still inside the window (does not record a new hit). */
  peek(key: string, now: number, windowMs: number): number[];
  /** Record a hit at `now` (prunes expired entries). */
  record(key: string, now: number, windowMs: number): void;
  /** Test helper — wipe all buckets. */
  clear(): void;
};

export function createMemoryStore(): RateLimitStore {
  const buckets = new Map<string, number[]>();

  function prune(key: string, now: number, windowMs: number): number[] {
    const cutoff = now - windowMs;
    const next = (buckets.get(key) ?? []).filter((t) => t > cutoff);
    if (next.length === 0) {
      buckets.delete(key);
    } else {
      buckets.set(key, next);
    }
    return next;
  }

  return {
    peek(key, now, windowMs) {
      return prune(key, now, windowMs);
    },
    record(key, now, windowMs) {
      const next = prune(key, now, windowMs);
      next.push(now);
      buckets.set(key, next);
    },
    clear() {
      buckets.clear();
    },
  };
}

/** Process-wide default store (Node actions / route handlers). */
export const memoryStore = createMemoryStore();
