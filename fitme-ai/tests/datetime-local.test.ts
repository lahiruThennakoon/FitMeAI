import { describe, it, expect } from "vitest";
import {
  buildDatetimeLocalValue,
  clampDatetimeLocal,
  from12Hour,
  fromDatetimeLocalValue,
  getCalendarCells,
  parseDatetimeLocalParts,
  setDatetimeLocalDate,
  setDatetimeLocalTime,
  to12Hour,
  toDatetimeLocalValue,
} from "@/lib/domain/datetime-local";

describe("datetime-local helpers", () => {
  it("round-trips a fixed local wall time", () => {
    const local = "2026-07-27T14:30";
    const iso = fromDatetimeLocalValue(local).toISOString();
    expect(toDatetimeLocalValue(iso)).toBe(local);
  });

  it("formats Date in local components", () => {
    const d = new Date(2026, 6, 27, 9, 5);
    expect(toDatetimeLocalValue(d)).toBe("2026-07-27T09:05");
  });

  it("parses and builds datetime-local parts", () => {
    const parts = parseDatetimeLocalParts("2026-07-30T10:30");
    expect(parts).toEqual({
      year: 2026,
      month: 7,
      day: 30,
      hour: 10,
      minute: 30,
    });
    expect(buildDatetimeLocalValue(parts!)).toBe("2026-07-30T10:30");
  });

  it("clamps values to max", () => {
    expect(clampDatetimeLocal("2026-07-30T12:00", "2026-07-30T10:30")).toBe(
      "2026-07-30T10:30",
    );
  });

  it("converts between 12h and 24h time", () => {
    expect(to12Hour(0)).toEqual({ hour12: 12, period: "AM" });
    expect(to12Hour(13)).toEqual({ hour12: 1, period: "PM" });
    expect(from12Hour(12, "AM")).toBe(0);
    expect(from12Hour(1, "PM")).toBe(13);
  });

  it("updates date and time portions independently", () => {
    const value = "2026-07-30T10:30";
    expect(setDatetimeLocalDate(value, "2026-07-28")).toBe("2026-07-28T10:30");
    expect(setDatetimeLocalTime(value, 4, 15, "PM")).toBe("2026-07-30T16:15");
  });

  it("builds a calendar grid with disabled future days", () => {
    const cells = getCalendarCells(2026, 7, "2026-07-30T23:59");
    const julyThirtieth = cells.find((cell) => cell.dateValue === "2026-07-30");
    const augustFirst = cells.find((cell) => cell.dateValue === "2026-08-01");

    expect(julyThirtieth?.disabled).toBe(false);
    expect(augustFirst?.disabled).toBe(true);
  });
});
