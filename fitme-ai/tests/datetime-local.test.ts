import { describe, it, expect } from "vitest";
import {
  fromDatetimeLocalValue,
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
});
