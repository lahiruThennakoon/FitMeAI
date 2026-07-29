import { describe, it, expect } from "vitest";
import { copyDayMessage, shiftInstantToDay } from "@/lib/domain/nutrition/copy-day";

const from = new Date("2026-07-27T00:00:00.000Z");
const to = new Date("2026-07-28T00:00:00.000Z");

describe("shiftInstantToDay", () => {
  it("keeps the time of day when moving a meal forward", () => {
    const result = shiftInstantToDay({
      instant: "2026-07-27T07:30:00.000Z",
      fromDayStart: from,
      toDayStart: to,
      now: new Date("2026-07-28T22:00:00.000Z"),
    });

    expect(result.iso).toBe("2026-07-28T07:30:00.000Z");
    expect(result.clamped).toBe(false);
  });

  it("clamps to now rather than logging a meal in the future", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    const result = shiftInstantToDay({
      instant: "2026-07-27T20:00:00.000Z",
      fromDayStart: from,
      toDayStart: to,
      now,
    });

    expect(result.iso).toBe(now.toISOString());
    expect(result.clamped).toBe(true);
  });

  it("treats a meal exactly at now as on time", () => {
    const now = new Date("2026-07-28T09:00:00.000Z");
    const result = shiftInstantToDay({
      instant: "2026-07-27T09:00:00.000Z",
      fromDayStart: from,
      toDayStart: to,
      now,
    });

    expect(result.clamped).toBe(false);
    expect(result.iso).toBe(now.toISOString());
  });

  it("preserves half-hour timezone day starts", () => {
    // Asia/Colombo: local midnight is 18:30Z the previous day.
    const result = shiftInstantToDay({
      instant: "2026-07-27T02:00:00.000Z",
      fromDayStart: new Date("2026-07-26T18:30:00.000Z"),
      toDayStart: new Date("2026-07-27T18:30:00.000Z"),
      now: new Date("2026-07-28T18:00:00.000Z"),
    });

    expect(result.iso).toBe("2026-07-28T02:00:00.000Z");
  });

  it("falls back to now for an unparseable instant instead of throwing", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    const result = shiftInstantToDay({
      instant: "not a date",
      fromDayStart: from,
      toDayStart: to,
      now,
    });

    expect(result.iso).toBe(now.toISOString());
    expect(result.clamped).toBe(false);
  });

  it("still keeps the time of day when copying across more than one day", () => {
    const result = shiftInstantToDay({
      instant: "2026-07-20T18:15:00.000Z",
      fromDayStart: new Date("2026-07-20T00:00:00.000Z"),
      toDayStart: new Date("2026-07-28T00:00:00.000Z"),
      now: new Date("2026-07-28T23:00:00.000Z"),
    });

    expect(result.iso).toBe("2026-07-28T18:15:00.000Z");
  });
});

describe("copyDayMessage", () => {
  it("says nothing was found without sounding like a failure", () => {
    const message = copyDayMessage({
      count: 0,
      clamped: 0,
      dayLabel: "Mon, Jul 27",
    });

    expect(message).toBe("No meals were logged on Mon, Jul 27 — nothing to copy.");
  });

  it("makes clear nothing is saved yet", () => {
    const message = copyDayMessage({
      count: 3,
      clamped: 0,
      dayLabel: "Mon, Jul 27",
    });

    expect(message).toContain("3 meals");
    expect(message).toContain("for review");
    expect(message).toContain("save to log");
  });

  it("uses singular wording for one meal", () => {
    const message = copyDayMessage({
      count: 1,
      clamped: 0,
      dayLabel: "Mon, Jul 27",
    });

    expect(message).toContain("1 meal from");
    expect(message).not.toContain("1 meals");
  });

  it("explains a single clamped time", () => {
    const message = copyDayMessage({
      count: 4,
      clamped: 1,
      dayLabel: "Mon, Jul 27",
    });

    expect(message).toContain("One was later in the day");
    expect(message).toContain("its time moved to now");
  });

  it("explains several clamped times", () => {
    const message = copyDayMessage({
      count: 4,
      clamped: 2,
      dayLabel: "Mon, Jul 27",
    });

    expect(message).toContain("2 were later in the day");
    expect(message).toContain("their times moved to now");
  });
});
