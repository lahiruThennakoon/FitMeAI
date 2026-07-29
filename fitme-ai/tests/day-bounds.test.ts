import { describe, it, expect } from "vitest";
import {
  buildHomeDayLabels,
  formatHomeDayShort,
  isWithinDay,
  previousZonedDayKey,
  resolveHomeDaySelection,
  startOfZonedDay,
  zonedDayBounds,
  zonedDayBoundsForDayKey,
} from "@/lib/domain/dashboard/day-bounds";

describe("zonedDayBounds (AD-10)", () => {
  it("returns Asia/Colombo day key for a known UTC instant", () => {
    // 2026-07-25 20:00 UTC = 2026-07-26 01:30 in Asia/Colombo (UTC+5:30)
    const now = new Date("2026-07-25T20:00:00.000Z");
    const bounds = zonedDayBounds(now, "Asia/Colombo");
    expect(bounds.dayKey).toBe("2026-07-26");
    expect(bounds.end.getTime()).toBeGreaterThan(bounds.start.getTime());
  });

  it("marks an instant inside the day bounds", () => {
    const bounds = zonedDayBounds(
      new Date("2026-07-26T10:00:00.000Z"),
      "UTC",
    );
    expect(bounds.dayKey).toBe("2026-07-26");
    expect(isWithinDay(new Date("2026-07-26T12:00:00.000Z"), bounds)).toBe(
      true,
    );
    expect(isWithinDay(new Date("2026-07-27T00:00:00.000Z"), bounds)).toBe(
      false,
    );
  });

  it("falls back to UTC for invalid timezone", () => {
    const bounds = zonedDayBounds(
      new Date("2026-07-26T12:00:00.000Z"),
      "Not/AZone",
    );
    expect(bounds.dayKey).toBe("2026-07-26");
  });

  it("startOfZonedDay is stable for a day key", () => {
    const a = startOfZonedDay("2026-01-15", "Asia/Colombo");
    const b = startOfZonedDay("2026-01-15", "Asia/Colombo");
    expect(a.getTime()).toBe(b.getTime());
  });
});

describe("resolveHomeDaySelection (Story 5.4)", () => {
  const now = new Date("2026-07-26T12:00:00.000Z");

  it("defaults to today when no day is requested", () => {
    const sel = resolveHomeDaySelection({
      now,
      timeZone: "UTC",
      requestedDay: null,
    });
    expect(sel.isToday).toBe(true);
    expect(sel.bounds.dayKey).toBe("2026-07-26");
    expect(sel.yesterdayKey).toBe("2026-07-25");
  });

  it("selects yesterday when requested", () => {
    const sel = resolveHomeDaySelection({
      now,
      timeZone: "UTC",
      requestedDay: "2026-07-25",
    });
    expect(sel.isToday).toBe(false);
    expect(sel.bounds.dayKey).toBe("2026-07-25");
    expect(isWithinDay(new Date("2026-07-25T12:00:00.000Z"), sel.bounds)).toBe(
      true,
    );
    expect(isWithinDay(new Date("2026-07-26T00:00:00.000Z"), sel.bounds)).toBe(
      false,
    );
  });

  it("selects any past day when requested", () => {
    const older = resolveHomeDaySelection({
      now,
      timeZone: "UTC",
      requestedDay: "2026-07-20",
    });
    expect(older.isToday).toBe(false);
    expect(older.bounds.dayKey).toBe("2026-07-20");
    expect(isWithinDay(new Date("2026-07-20T12:00:00.000Z"), older.bounds)).toBe(
      true,
    );
  });

  it("falls back to today for future keys", () => {
    const future = resolveHomeDaySelection({
      now,
      timeZone: "UTC",
      requestedDay: "2026-07-27",
    });
    expect(future.isToday).toBe(true);
    expect(future.bounds.dayKey).toBe("2026-07-26");
  });

  it("falls back to today for malformed day query", () => {
    const sel = resolveHomeDaySelection({
      now,
      timeZone: "UTC",
      requestedDay: "not-a-day",
    });
    expect(sel.isToday).toBe(true);
    expect(sel.bounds.dayKey).toBe("2026-07-26");
  });

  it("resolves true Colombo midnight (half-hour offset)", () => {
    // Asia/Colombo midnight for 2026-07-26 is 2026-07-25T18:30:00.000Z
    const start = startOfZonedDay("2026-07-26", "Asia/Colombo");
    expect(start.toISOString()).toBe("2026-07-25T18:30:00.000Z");
    expect(previousZonedDayKey("2026-07-26", "Asia/Colombo")).toBe(
      "2026-07-25",
    );
  });

  it("respects Asia/Colombo day boundary for yesterday", () => {
    // 2026-07-25 20:00 UTC = 2026-07-26 in Colombo → yesterday is 2026-07-25
    const colomboNow = new Date("2026-07-25T20:00:00.000Z");
    const sel = resolveHomeDaySelection({
      now: colomboNow,
      timeZone: "Asia/Colombo",
      requestedDay: "2026-07-25",
    });
    expect(sel.todayKey).toBe("2026-07-26");
    expect(sel.yesterdayKey).toBe("2026-07-25");
    expect(sel.isToday).toBe(false);
    expect(sel.bounds.dayKey).toBe("2026-07-25");
  });

  it("previousZonedDayKey and boundsForDayKey stay consistent", () => {
    expect(previousZonedDayKey("2026-07-26", "UTC")).toBe("2026-07-25");
    const bounds = zonedDayBoundsForDayKey("2026-07-25", "UTC");
    expect(bounds.dayKey).toBe("2026-07-25");
    expect(bounds.end.getTime()).toBe(
      startOfZonedDay("2026-07-26", "UTC").getTime(),
    );
  });

  it("buildHomeDayLabels formats past days", () => {
    const labels = buildHomeDayLabels("2026-07-20", "2026-07-26", "2026-07-25");
    expect(labels.isToday).toBe(false);
    expect(labels.isYesterday).toBe(false);
    expect(labels.mealsHeading).toContain("Meals ·");
    expect(labels.switcherLabel).toContain("2026-07-20");
  });

  it("names the viewed day in removal prompts, not always today", () => {
    const today = buildHomeDayLabels("2026-07-26", "2026-07-26", "2026-07-25");
    expect(today.removeScopeLabel).toBe("today");

    const yesterday = buildHomeDayLabels(
      "2026-07-25",
      "2026-07-26",
      "2026-07-25",
    );
    expect(yesterday.removeScopeLabel).toBe("yesterday");

    const older = buildHomeDayLabels("2026-07-20", "2026-07-26", "2026-07-25");
    expect(older.removeScopeLabel).not.toBe("today");
    expect(older.removeScopeLabel).toBe(formatHomeDayShort("2026-07-20"));
  });
});
