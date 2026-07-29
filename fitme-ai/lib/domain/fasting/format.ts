/** Pure helpers for fasting duration display (Story 7.1). */

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Past a day, hours alone stop reading as a duration ("51h 12m" needs mental
 * arithmetic), so days lead once there are any.
 */
export function formatDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) {
    return `${days}d ${hours % 24}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

export function hoursFromMs(ms: number): number {
  return ms / MS_PER_HOUR;
}

/**
 * A timer running this long is far more likely to be one the user forgot to
 * stop than a genuine multi-day fast, so the UI offers a nudge at this point.
 */
export const STALE_FAST_MS = 48 * MS_PER_HOUR;

export function isStaleFast(elapsedMs: number): boolean {
  return elapsedMs >= STALE_FAST_MS;
}

/**
 * Nudge shown alongside a very long-running timer. Deliberately not an alarm —
 * long fasts are legitimate, we just make the correction path visible.
 */
export function staleFastNudge(elapsedMs: number): string | null {
  if (!isStaleFast(elapsedMs)) return null;
  return `This timer has been running for ${formatDurationMs(elapsedMs)}. If you forgot to end it, adjust the times or discard it — nothing here is locked in.`;
}
