import type { AuthRateLimitFn } from "@/lib/auth/actions-shared";

/** Permissive rate-limit stubs so action unit tests stay isolated from the store. */
export const allowAuthRateLimit: AuthRateLimitFn = () => ({
  ok: true,
  remaining: 99,
});

export const testClientKey = async () => "ip:test";

export const authRateLimitTestDeps = {
  getClientKey: testClientKey,
  rateLimit: allowAuthRateLimit,
};
