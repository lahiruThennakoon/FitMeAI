/**
 * Auth rate-limit buckets (Story 1.8 / FR-30).
 * Documented in README — tune here only.
 */

export const RATE_LIMIT_ERROR =
  "Too many attempts. Please try again later.";

export const AUTH_RATE_LIMITS = {
  /** Better Auth HTTP handler (`/api/auth/*`). */
  apiAuth: { limit: 60, windowMs: 60_000 },
  login: { limit: 10, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  passwordResetRequest: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 10, windowMs: 60 * 60_000 },
} as const;

export type AuthRateLimitBucket = keyof typeof AUTH_RATE_LIMITS;

/** AI Server Action buckets (Story 2.3 / FR-30). */
export const AI_RATE_LIMITS = {
  foodParse: { limit: 30, windowMs: 60 * 60_000 },
} as const;

export type AiRateLimitBucket = keyof typeof AI_RATE_LIMITS;
