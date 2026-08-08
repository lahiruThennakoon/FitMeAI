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

/** Calendar day key (YYYY-MM-DD) for an instant in the profile timezone. */
export function dayKeyForInstant(
  date: Date,
  timeZone: string | null | undefined,
): string {
  const tz =
    timeZone && timeZone.trim().length > 0 ? timeZone.trim() : "UTC";
  return dayKeyInTimeZone(date, tz);
}

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

/** Next local calendar day key (profile timezone). */
export function nextZonedDayKey(
  dayKey: string,
  timeZone: string | null | undefined,
): string {
  const tz = normalizeTimeZone(timeZone);
  const end = zonedDayBoundsForDayKey(dayKey, tz).end;
  return dayKeyInTimeZone(new Date(end.getTime() + 1), tz);
}

/** Short label for a day key, e.g. "Mon, Jul 20". */
export function formatHomeDayShort(dayKey: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(`${dayKey}T12:00:00`));
  } catch {
    return dayKey;
  }
}

export type HomeDayLabels = {
  isToday: boolean;
  isYesterday: boolean;
  dayKey: string;
  switcherLabel: string;
  summaryPrefix: string;
  energyTitle: string;
  mealsHeading: string;
  exerciseHeading: string;
  mealsAria: string;
  exerciseAria: string;
  headerBlurb: string;
  mealsEmpty: string;
  exerciseEmpty: string;
  /** Day named in destructive-action prompts, e.g. "today" / "Mon, Jul 20". */
  removeScopeLabel: string;
};

export function buildHomeDayLabels(
  dayKey: string,
  todayKey: string,
  yesterdayKey: string,
): HomeDayLabels {
  const isToday = dayKey === todayKey;
  const isYesterday = dayKey === yesterdayKey;
  const short = formatHomeDayShort(dayKey);

  const switcherLabel = isToday
    ? `Today · ${dayKey}`
    : isYesterday
      ? `Yesterday · ${dayKey}`
      : `${short} · ${dayKey}`;

  const summaryPrefix = isToday
    ? "Today"
    : isYesterday
      ? "Yesterday"
      : short;

  const energyTitle = isToday
    ? "Today’s energy"
    : isYesterday
      ? "Yesterday’s energy"
      : `${short} · energy`;

  const mealsHeading = isToday
    ? "Meals today"
    : isYesterday
      ? "Meals yesterday"
      : `Meals · ${short}`;

  const exerciseHeading = isToday
    ? "Exercise today"
    : isYesterday
      ? "Exercise yesterday"
      : `Exercise · ${short}`;

  const mealsAria = isToday
    ? "Today's meals, scrollable"
    : isYesterday
      ? "Yesterday's meals, scrollable"
      : `${short} meals, scrollable`;

  const exerciseAria = isToday
    ? "Today's workouts, scrollable"
    : isYesterday
      ? "Yesterday's workouts, scrollable"
      : `${short} workouts, scrollable`;

  const headerBlurb = isToday
    ? "A calm look at today — use it to decide your next move."
    : isYesterday
      ? "A calm look at yesterday — every day is just a chapter."
      : `A calm look at ${short} — every day is just a chapter.`;

  const mealsEmpty = isToday
    ? "No meals yet today — a short description is enough to get started."
    : isYesterday
      ? "No meals logged yesterday — that's fine. Today is a fresh page."
      : `No meals logged ${short}.`;

  const exerciseEmpty = isToday
    ? "No workouts yet today — a short log keeps energy balance honest."
    : isYesterday
      ? "No workouts logged yesterday — rest days count too."
      : `No workouts logged ${short}.`;

  const removeScopeLabel = isToday
    ? "today"
    : isYesterday
      ? "yesterday"
      : short;

  return {
    isToday,
    isYesterday,
    dayKey,
    switcherLabel,
    summaryPrefix,
    energyTitle,
    mealsHeading,
    exerciseHeading,
    mealsAria,
    exerciseAria,
    headerBlurb,
    removeScopeLabel,
    mealsEmpty,
    exerciseEmpty,
  };
}

/** First-visit copy when today has no meals logged yet. */
export const FIRST_VISIT_HEADER_BLURB =
  "Start by logging what you've eaten — your numbers will show up here.";

export function resolveDashboardHeaderBlurb(
  labels: HomeDayLabels,
  opts: { showFirstVisit: boolean },
): string {
  if (opts.showFirstVisit && labels.isToday) {
    return FIRST_VISIT_HEADER_BLURB;
  }
  return labels.headerBlurb;
}

/** True when the dashboard should orient a new user instead of showing analytics. */
export function isDashboardFirstVisitMode(input: {
  isToday: boolean;
  mealCountToday: number;
}): boolean {
  return input.isToday && input.mealCountToday === 0;
}

/** True for users who have never logged food and are viewing today. */
export function isDashboardOnboardingMode(input: {
  isToday: boolean;
  hasEverLoggedMeal: boolean;
}): boolean {
  return input.isToday && !input.hasEverLoggedMeal;
}

export type HomeDaySelection = {
  bounds: DayBounds;
  todayKey: string;
  yesterdayKey: string;
  isToday: boolean;
  labels: HomeDayLabels;
};

/**
 * Resolve Home day view: today or any past calendar day in profile timezone.
 * Invalid / future keys fall back to today.
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

  const finish = (bounds: DayBounds, isToday: boolean): HomeDaySelection => ({
    bounds,
    todayKey,
    yesterdayKey,
    isToday,
    labels: buildHomeDayLabels(bounds.dayKey, todayKey, yesterdayKey),
  });

  if (requested && DAY_KEY_RE.test(requested)) {
    if (requested === todayKey) {
      return finish(todayBounds, true);
    }
    if (requested < todayKey) {
      return finish(zonedDayBoundsForDayKey(requested, tz), false);
    }
  }

  return finish(todayBounds, true);
}
