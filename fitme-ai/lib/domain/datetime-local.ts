/** Helpers for `<input type="datetime-local">` (browser local wall time). */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO or Date → `YYYY-MM-DDTHH:mm` in the browser's local timezone. */
export function toDatetimeLocalValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** `datetime-local` value → Date (interpreted as local wall time). */
export function fromDatetimeLocalValue(value: string): Date {
  return new Date(value);
}

export type DatetimeLocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Parse a `datetime-local` string into local wall-time parts. */
export function parseDatetimeLocalParts(value: string): DatetimeLocalParts | null {
  const match = DATETIME_LOCAL_RE.exec(value);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

/** Build a `datetime-local` string from parts. */
export function buildDatetimeLocalValue(parts: DatetimeLocalParts): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

/** Human-readable label for trigger buttons. */
export function formatDatetimeLocalDisplay(value: string): string {
  const parts = parseDatetimeLocalParts(value);
  if (!parts) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(fromDatetimeLocalValue(value));
}

/** Clamp a value to `max` when both are valid `datetime-local` strings. */
export function clampDatetimeLocal(value: string, max?: string): string {
  if (!value || !max) return value;
  return value > max ? max : value;
}

/** Current local time as `datetime-local`, optionally clamped. */
export function getNowDatetimeLocal(max?: string): string {
  const now = toDatetimeLocalValue(new Date());
  return max ? clampDatetimeLocal(now, max) : now;
}

export type CalendarCell = {
  key: string;
  day: number;
  dateValue: string;
  inMonth: boolean;
  disabled: boolean;
};

/** Six-week calendar grid for a month view (Sun–Sat). */
export function getCalendarCells(
  viewYear: number,
  viewMonth: number,
  max?: string,
): CalendarCell[] {
  const first = new Date(viewYear, viewMonth - 1, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth - 1, 0).getDate();
  const maxDate = max?.slice(0, 10) ?? null;
  const cells: CalendarCell[] = [];

  for (let i = 0; i < 42; i++) {
    let day: number;
    let month = viewMonth;
    let year = viewYear;
    let inMonth = true;

    if (i < startOffset) {
      day = daysInPrevMonth - startOffset + i + 1;
      month = viewMonth - 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      inMonth = false;
    } else if (i >= startOffset + daysInMonth) {
      day = i - startOffset - daysInMonth + 1;
      month = viewMonth + 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      inMonth = false;
    } else {
      day = i - startOffset + 1;
    }

    const dateValue = `${year}-${pad2(month)}-${pad2(day)}`;
    const disabled = maxDate !== null && dateValue > maxDate;

    cells.push({
      key: `${dateValue}-${i}`,
      day,
      dateValue,
      inMonth,
      disabled,
    });
  }

  return cells;
}

export function to12Hour(hour24: number): { hour12: number; period: "AM" | "PM" } {
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12;
  return { hour12: hour12 === 0 ? 12 : hour12, period };
}

export function from12Hour(hour12: number, period: "AM" | "PM"): number {
  if (period === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

export const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) => minute);

/** Replace the date portion of a `datetime-local` value. */
export function setDatetimeLocalDate(value: string, dateValue: string): string {
  const parts = parseDatetimeLocalParts(value);
  if (!parts) return value;

  const [year, month, day] = dateValue.split("-").map(Number);
  return buildDatetimeLocalValue({ ...parts, year, month, day });
}

/** Replace the time portion of a `datetime-local` value. */
export function setDatetimeLocalTime(
  value: string,
  hour12: number,
  minute: number,
  period: "AM" | "PM",
): string {
  const parts = parseDatetimeLocalParts(value);
  if (!parts) return value;

  return buildDatetimeLocalValue({
    ...parts,
    hour: from12Hour(hour12, period),
    minute,
  });
}

export function monthLabel(viewYear: number, viewMonth: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(viewYear, viewMonth - 1, 1));
}

export function shiftMonth(
  viewYear: number,
  viewMonth: number,
  delta: -1 | 1,
): { year: number; month: number } {
  const date = new Date(viewYear, viewMonth - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}
