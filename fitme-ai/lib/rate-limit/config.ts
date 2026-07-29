/**
 * Auth rate-limit buckets (Story 1.8 / FR-30).
 * Documented in README — tune here only.
 */

export const RATE_LIMIT_ERROR =
  "Too many attempts. Please try again later.";

/**
 * Same message with the wait spelled out. "Later" leaves the user guessing
 * whether to wait a minute or give up for the day.
 */
export function rateLimitMessage(retryAfterSec: number): string {
  if (!Number.isFinite(retryAfterSec) || retryAfterSec <= 0) {
    return RATE_LIMIT_ERROR;
  }
  return `Too many attempts. Try again in ${formatWait(retryAfterSec)}.`;
}

/** Round up — promising 59 seconds and needing 60 is worse than saying "a minute". */
export function formatWait(seconds: number): string {
  const s = Math.ceil(seconds);
  if (s < 60) return `${s} second${s === 1 ? "" : "s"}`;
  const minutes = Math.ceil(s / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

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
