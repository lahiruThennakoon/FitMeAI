/**
 * Profile-timezone day boundaries (AD-10).
 * Storage remains UTC; "today" is the user's calendar day in their timezone.
 */

export type DayBounds = {
  /** Inclusive start (UTC instant of local midnight). */
  start: Date;
  /** Exclusive end (UTC instant of next local midnight). */
  end: Date;
  /** YYYY-MM-DD in the profile timezone. */
  dayKey: string;
};

function dayKeyInTimeZone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

/**
 * Find the UTC instant when `dayKey` begins in `timeZone`.
 * Uses 15-minute steps so half-hour offsets (e.g. Asia/Colombo UTC+5:30) resolve
 * to true local midnight — hourly probes leave a 30-minute error that breaks
 * previous-day math.
 */
export function startOfZonedDay(dayKey: string, timeZone: string): Date {
  const stepMs = 15 * 60 * 1000;
  // Probe from UTC midnight of that calendar date, then walk to the true local midnight.
  let probe = new Date(`${dayKey}T00:00:00.000Z`);
  for (let i = 0; i < 48 * 4; i++) {
    const key = dayKeyInTimeZone(probe, timeZone);
    if (key === dayKey) {
      const prev = new Date(probe.getTime() - stepMs);
      if (dayKeyInTimeZone(prev, timeZone) !== dayKey) return probe;
      probe = prev;
    } else if (key < dayKey) {
      probe = new Date(probe.getTime() + stepMs);
    } else {
      probe = new Date(probe.getTime() - stepMs);
    }
  }
  return new Date(`${dayKey}T00:00:00.000Z`);
}

export function zonedDayBounds(
  now: Date,
  timeZone: string | null | undefined,
): DayBounds {
  const tz =
    timeZone && timeZone.trim().length > 0 ? timeZone.trim() : "UTC";
  const dayKey = dayKeyInTimeZone(now, tz);
  const start = startOfZonedDay(dayKey, tz);
  // Next calendar day
  const nextUtcGuess = new Date(start.getTime() + 36 * 60 * 60 * 1000);
  const nextKey = dayKeyInTimeZone(nextUtcGuess, tz);
  const end = startOfZonedDay(nextKey, tz);
  return { start, end, dayKey };
}

export function isWithinDay(date: Date, bounds: DayBounds): boolean {
  const t = date.getTime();
  return t >= bounds.start.getTime() && t < bounds.end.getTime();
}

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeTimeZone(timeZone: string | null | undefined): string {
  return timeZone && timeZone.trim().length > 0 ? timeZone.trim() : "UTC";
}

/** Bounds for an explicit calendar day key in the profile timezone. */
export function zonedDayBoundsForDayKey(
  dayKey: string,
  timeZone: string | null | undefined,
): DayBounds {
  const tz = normalizeTimeZone(timeZone);
  const start = startOfZonedDay(dayKey, tz);
  const nextUtcGuess = new Date(start.getTime() + 36 * 60 * 60 * 1000);
  const nextKey = dayKeyInTimeZone(nextUtcGuess, tz);
  const end = startOfZonedDay(nextKey, tz);
  return { start, end, dayKey };
}

/** Previous local calendar day key (profile timezone). */
export function previousZonedDayKey(
  dayKey: string,
  timeZone: string | null | undefined,
): string {
  const tz = normalizeTimeZone(timeZone);
  const start = startOfZonedDay(dayKey, tz);
  return dayKeyInTimeZone(new Date(start.getTime() - 1), tz);
}

export type HomeDaySelection = {
  bounds: DayBounds;
  todayKey: string;
  yesterdayKey: string;
  isToday: boolean;
};

/**
 * Resolve Home day view (Story 5.4): today or yesterday only.
 * Invalid / future / unknown keys fall back to today.
 */
export function resolveHomeDaySelection(input: {
  now: Date;
  timeZone: string | null | undefined;
  requestedDay?: string | null;
}): HomeDaySelection {
  const tz = normalizeTimeZone(input.timeZone);
  const todayBounds = zonedDayBounds(input.now, tz);
  const todayKey = todayBounds.dayKey;
  const yesterdayKey = previousZonedDayKey(todayKey, tz);
  const requested = input.requestedDay?.trim() ?? "";

  if (requested === yesterdayKey) {
    return {
      bounds: zonedDayBoundsForDayKey(yesterdayKey, tz),
      todayKey,
      yesterdayKey,
      isToday: false,
    };
  }

  // Explicit today, missing, malformed, future, or any other day → today
  if (requested && requested !== todayKey && DAY_KEY_RE.test(requested)) {
    // fall through to today (future / older than yesterday not offered in v1)
  }

  return {
    bounds: todayBounds,
    todayKey,
    yesterdayKey,
    isToday: true,
  };
}
