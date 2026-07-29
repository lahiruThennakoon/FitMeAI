/**
 * Copying a past day's meals forward (Tier 3 logging convenience).
 *
 * A copied meal keeps its time of day — breakfast stays breakfast — so the
 * spacing of the original day survives. Anything that would land in the future
 * is pulled back to now rather than silently logged ahead of the clock.
 */

export type ShiftedInstant = {
  iso: string;
  /** True when the kept time of day was still ahead of `now`. */
  clamped: boolean;
};

/**
 * Move an instant from one calendar day to another, keeping its offset from
 * the day's start. Day starts are UTC instants of local midnight, so the
 * arithmetic stays in milliseconds and needs no timezone parsing here.
 */
export function shiftInstantToDay(input: {
  instant: Date | string;
  fromDayStart: Date;
  toDayStart: Date;
  now: Date;
}): ShiftedInstant {
  const source = new Date(input.instant);
  const now = input.now;
  if (Number.isNaN(source.getTime())) {
    return { iso: now.toISOString(), clamped: false };
  }

  const offsetMs = source.getTime() - input.fromDayStart.getTime();
  const shifted = input.toDayStart.getTime() + offsetMs;
  if (shifted > now.getTime()) {
    return { iso: now.toISOString(), clamped: true };
  }
  return { iso: new Date(shifted).toISOString(), clamped: false };
}

/**
 * What the user is told after a copy. Nothing is saved yet, so the message
 * points at the review list rather than claiming a log was written.
 */
export function copyDayMessage(input: {
  count: number;
  clamped: number;
  dayLabel: string;
}): string {
  if (input.count === 0) {
    return `No meals were logged on ${input.dayLabel} — nothing to copy.`;
  }
  const noun = input.count === 1 ? "meal" : "meals";
  const base = `Loaded ${input.count} ${noun} from ${input.dayLabel} for review — edit or remove any, then save to log.`;
  if (input.clamped === 0) return base;
  const which = input.clamped === 1 ? "One" : `${input.clamped}`;
  const verb = input.clamped === 1 ? "was" : "were";
  return `${base} ${which} ${verb} later in the day than right now, so ${input.clamped === 1 ? "its time" : "their times"} moved to now.`;
}
