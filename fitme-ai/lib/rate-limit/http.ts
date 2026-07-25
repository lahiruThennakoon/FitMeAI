import { RATE_LIMIT_ERROR } from "@/lib/rate-limit/config";
import { clientKeyFromHeaders } from "@/lib/rate-limit/client-key";
import { enforceAuthRateLimit } from "@/lib/rate-limit/enforce";
import { bucketForAuthPath } from "@/lib/rate-limit/path-bucket";
import { memoryStore, type RateLimitStore } from "@/lib/rate-limit/store";

export type AuthApiRateLimitDeps = {
  store?: RateLimitStore;
  now?: number;
};

/**
 * Enforce auth HTTP rate limits. Credential paths use tight buckets;
 * other `/api/auth/*` traffic uses `apiAuth`. Returns 429 Response or null.
 */
export function authApiRateLimitResponse(
  request: Request,
  deps: AuthApiRateLimitDeps = {},
): Response | null {
  const url = new URL(request.url);
  const bucket = bucketForAuthPath(url.pathname);
  const result = enforceAuthRateLimit({
    bucket,
    clientKey: clientKeyFromHeaders(request.headers),
    store: deps.store ?? memoryStore,
    now: deps.now,
  });
  if (result.ok) return null;

  return new Response(JSON.stringify({ error: RATE_LIMIT_ERROR }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(result.retryAfterSec),
    },
  });
}
