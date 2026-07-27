import { describe, it, expect } from "vitest";
import { saveWeightEntrySchema } from "@/lib/schemas/weight";

describe("saveWeightEntrySchema (Story 6.1)", () => {
  it("accepts a typical adult weight in grams", () => {
    const parsed = saveWeightEntrySchema.safeParse({ weightG: 72_500 });
    expect(parsed.success).toBe(true);
  });

  it("rejects zero / negative", () => {
    expect(saveWeightEntrySchema.safeParse({ weightG: 0 }).success).toBe(
      false,
    );
    expect(saveWeightEntrySchema.safeParse({ weightG: -1000 }).success).toBe(
      false,
    );
  });

  it("rejects absurdly high values", () => {
    expect(
      saveWeightEntrySchema.safeParse({ weightG: 900_000 }).success,
    ).toBe(false);
  });
});
