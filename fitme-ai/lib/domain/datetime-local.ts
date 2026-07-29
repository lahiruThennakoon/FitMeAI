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
