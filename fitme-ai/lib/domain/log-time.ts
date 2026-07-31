/**
 * Shared guards for user-supplied log timestamps.
 *
 * Backdating is allowed everywhere (FR-9 correction path) but future times are
 * not — a log is a record of something that happened.
 */

/** Tolerance for client clock skew when rejecting future timestamps. */
export const LOG_TIME_SKEW_MS = 5 * 60 * 1000;

export const FUTURE_TIME_MESSAGE = "That time is in the future.";

export const INVALID_TIME_MESSAGE = "Pick a valid date and time.";

export function isFutureInstant(at: Date | number, now = Date.now()): boolean {
  const t = typeof at === "number" ? at : at.getTime();
  if (Number.isNaN(t)) return false;
  return t > now + LOG_TIME_SKEW_MS;
}

/**
 * Zod refinement for an ISO timestamp that must not be in the future.
 * Malformed values pass here so `.datetime()` owns the shape error.
 */
export function isNotFutureIso(value: string | undefined | null): boolean {
  if (!value) return true;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return true;
  return !isFutureInstant(t);
}

/** If a timestamp is slightly ahead of client now (server clock skew), clamp to now. */
export function clampFutureInstant(at: Date | number, now = Date.now()): Date {
  const d = typeof at === "number" ? new Date(at) : at;
  if (Number.isNaN(d.getTime())) return new Date(now);
  return isFutureInstant(d, now) ? new Date(now) : d;
}
