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
 */
export function startOfZonedDay(dayKey: string, timeZone: string): Date {
  // Probe from UTC midnight of that calendar date, then walk to the true local midnight.
  let probe = new Date(`${dayKey}T00:00:00.000Z`);
  for (let i = 0; i < 48; i++) {
    const key = dayKeyInTimeZone(probe, timeZone);
    if (key === dayKey) {
      const prev = new Date(probe.getTime() - 60 * 60 * 1000);
      if (dayKeyInTimeZone(prev, timeZone) !== dayKey) return probe;
      probe = prev;
    } else if (key < dayKey) {
      probe = new Date(probe.getTime() + 60 * 60 * 1000);
    } else {
      probe = new Date(probe.getTime() - 60 * 60 * 1000);
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
