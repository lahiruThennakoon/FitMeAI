import { describe, it, expect } from "vitest";
import { saveWaterEntrySchema } from "@/lib/schemas/water";

describe("saveWaterEntrySchema (Story 5.1)", () => {
  it("accepts a valid quick-add amount", () => {
    const parsed = saveWaterEntrySchema.safeParse({ amountMl: 250 });
    expect(parsed.success).toBe(true);
  });

  it("accepts a custom amount with an explicit loggedAt", () => {
    const parsed = saveWaterEntrySchema.safeParse({
      amountMl: 700,
      loggedAt: "2026-07-26T08:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects zero or negative amounts", () => {
    expect(saveWaterEntrySchema.safeParse({ amountMl: 0 }).success).toBe(
      false,
    );
    expect(saveWaterEntrySchema.safeParse({ amountMl: -50 }).success).toBe(
      false,
    );
  });

  it("rejects amounts above the single-log cap", () => {
    const parsed = saveWaterEntrySchema.safeParse({ amountMl: 6000 });
    expect(parsed.success).toBe(false);
  });

  it("rejects non-integer amounts", () => {
    const parsed = saveWaterEntrySchema.safeParse({ amountMl: 250.5 });
    expect(parsed.success).toBe(false);
  });
});
