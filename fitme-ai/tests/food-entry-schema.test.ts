import { describe, it, expect } from "vitest";
import { editFoodEntrySchema } from "@/lib/schemas/food-entry";

const validPayload = {
  name: "Two eggs",
  quantity: 2,
  energyKcal: 144,
  proteinG: 12.6,
  carbsG: 0.8,
  fatG: 9.6,
  fibreG: 0,
  sugarG: 0.4,
};

describe("editFoodEntrySchema (Story 5.2)", () => {
  it("accepts a valid edit payload", () => {
    expect(editFoodEntrySchema.safeParse(validPayload).success).toBe(true);
  });

  it("accepts null macros (unknown, never coerced to 0)", () => {
    const parsed = editFoodEntrySchema.safeParse({
      ...validPayload,
      energyKcal: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      fibreG: null,
      sugarG: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(
      editFoodEntrySchema.safeParse({ ...validPayload, name: "" }).success,
    ).toBe(false);
  });

  it("rejects a zero or negative quantity", () => {
    expect(
      editFoodEntrySchema.safeParse({ ...validPayload, quantity: 0 }).success,
    ).toBe(false);
    expect(
      editFoodEntrySchema.safeParse({ ...validPayload, quantity: -1 }).success,
    ).toBe(false);
  });

  it("rejects negative macros", () => {
    expect(
      editFoodEntrySchema.safeParse({ ...validPayload, energyKcal: -1 })
        .success,
    ).toBe(false);
  });

  it("rejects macros above sane caps", () => {
    expect(
      editFoodEntrySchema.safeParse({ ...validPayload, energyKcal: 50_000 })
        .success,
    ).toBe(false);
  });

  it("rejects a name over 120 characters", () => {
    expect(
      editFoodEntrySchema.safeParse({
        ...validPayload,
        name: "a".repeat(121),
      }).success,
    ).toBe(false);
  });
});
