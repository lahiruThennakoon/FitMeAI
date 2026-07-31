import { describe, it, expect } from "vitest";
import {
  clampFutureInstant,
  isFutureInstant,
  LOG_TIME_SKEW_MS,
} from "@/lib/domain/log-time";

describe("clampFutureInstant", () => {
  it("returns the same date when not in the future", () => {
    const past = new Date(Date.now() - 60_000);
    expect(clampFutureInstant(past).getTime()).toBe(past.getTime());
  });

  it("clamps timestamps slightly ahead of client now (server skew)", () => {
    const now = Date.now();
    const skewed = new Date(now + LOG_TIME_SKEW_MS + 1);
    expect(isFutureInstant(skewed, now)).toBe(true);
    expect(clampFutureInstant(skewed, now).getTime()).toBe(now);
  });
});
