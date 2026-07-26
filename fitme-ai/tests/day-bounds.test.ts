import { describe, it, expect } from "vitest";
import {
  isWithinDay,
  startOfZonedDay,
  zonedDayBounds,
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
