import {
  AUTH_RATE_LIMITS,
  RATE_LIMIT_ERROR,
  type AuthRateLimitBucket,
} from "@/lib/rate-limit/config";
import { checkRateLimit, type RateLimitResult } from "@/lib/rate-limit/check";
import { memoryStore, type RateLimitStore } from "@/lib/rate-limit/store";

export { RATE_LIMIT_ERROR };

export type EnforceAuthRateLimitInput = {
  bucket: AuthRateLimitBucket;
  clientKey: string;
  store?: RateLimitStore;
  now?: number;
};

export function enforceAuthRateLimit(
  input: EnforceAuthRateLimitInput,
): RateLimitResult {
  const { limit, windowMs } = AUTH_RATE_LIMITS[input.bucket];
  return checkRateLimit({
    key: `${input.bucket}:${input.clientKey}`,
    limit,
    windowMs,
    store: input.store ?? memoryStore,
    now: input.now,
  });
}
