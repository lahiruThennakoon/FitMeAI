import type { RateLimitStore } from "@/lib/rate-limit/store";

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

export type CheckRateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
  store: RateLimitStore;
  now?: number;
};

/**
 * Sliding-window rate limit: allow up to `limit` hits in `windowMs`.
 * Denied requests are not recorded so the window clears predictably.
 */
export function checkRateLimit(input: CheckRateLimitInput): RateLimitResult {
  const now = input.now ?? Date.now();
  const hits = input.store.peek(input.key, now, input.windowMs);
  if (hits.length >= input.limit) {
    const oldest = hits[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + input.windowMs - now) / 1000),
    );
    return { ok: false, retryAfterSec };
  }
  input.store.record(input.key, now, input.windowMs);
  return { ok: true, remaining: input.limit - hits.length - 1 };
}
