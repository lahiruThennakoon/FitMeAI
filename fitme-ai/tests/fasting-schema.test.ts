import { describe, it, expect } from "vitest";
import {
  endFastingSessionSchema,
  startFastingSessionSchema,
} from "@/lib/schemas/fasting";
import { formatDurationMs } from "@/lib/domain/fasting/format";

describe("startFastingSessionSchema (Story 7.1)", () => {
  it("accepts empty optional fields", () => {
    expect(startFastingSessionSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a 16h plan", () => {
    const parsed = startFastingSessionSchema.safeParse({
      plannedDurationMin: 960,
      protocolLabel: "16:8",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects absurd planned duration", () => {
    expect(
      startFastingSessionSchema.safeParse({
        plannedDurationMin: 20_000,
      }).success,
    ).toBe(false);
  });
});

describe("endFastingSessionSchema (Story 7.1)", () => {
  it("accepts empty body (end active)", () => {
    expect(endFastingSessionSchema.safeParse({}).success).toBe(true);
  });
});

describe("formatDurationMs", () => {
  it("formats hours and minutes", () => {
    expect(formatDurationMs(8 * 60 * 60 * 1000 + 5 * 60 * 1000)).toBe(
      "8h 05m",
    );
  });
});
