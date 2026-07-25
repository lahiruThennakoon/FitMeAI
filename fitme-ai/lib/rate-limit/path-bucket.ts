import type { AuthRateLimitBucket } from "@/lib/rate-limit/config";

/**
 * Map Better Auth HTTP paths to the same tight buckets as Server Actions
 * (Story 1.8 review Decision 1). Everything else uses the coarse apiAuth budget.
 */
export function bucketForAuthPath(pathname: string): AuthRateLimitBucket {
  const normalized = pathname.toLowerCase();
  // Strip optional /api/auth prefix.
  const path = normalized.replace(/^\/api\/auth\/?/, "");

  if (path.startsWith("sign-in")) return "login";
  if (path.startsWith("sign-up")) return "register";
  if (
    path.startsWith("forget-password") ||
    path.startsWith("request-password-reset") ||
    path.includes("forget-password")
  ) {
    return "passwordResetRequest";
  }
  if (path.startsWith("reset-password") || path.includes("reset-password")) {
    return "passwordReset";
  }
  if (path.includes("delete-user") || path.includes("delete-account")) {
    return "login";
  }
  return "apiAuth";
}
