import { describe, it, expect } from "vitest";
import { editFoodEntrySchema } from "@/lib/schemas/food-entry";

const validPayload = {
  name: "Two eggs",
  quantity: 2,
  unit: "piece",
  mealType: "breakfast",
  loggedAt: "2026-01-15T08:30:00.000Z",
  energyKcal: 144,
  proteinG: 12.6,
  carbsG: 0.8,
  fatG: 9.6,
  fibreG: 0,
  sugarG: 0.4,
  sodiumMg: 140,
  note: null,
};

describe("editFoodEntrySchema (Story 5.2)", () => {
  it("accepts a valid edit payload", () => {
    expect(editFoodEntrySchema.safeParse(validPayload).success).toBe(true);
  });

  it("accepts a note and trims it", () => {
    const parsed = editFoodEntrySchema.safeParse({
      ...validPayload,
      note: "  shared with Amma  ",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.note).toBe("shared with Amma");
  });

  it("requires the note field so a full-replace edit can't drop one", () => {
    const { note: _note, ...withoutNote } = validPayload;

    expect(editFoodEntrySchema.safeParse(withoutNote).success).toBe(false);
  });

  it("rejects a note over 500 characters", () => {
    expect(
      editFoodEntrySchema.safeParse({
        ...validPayload,
        note: "x".repeat(501),
      }).success,
    ).toBe(false);
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
      sodiumMg: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("allows backdating so a mis-timed meal can move to the right day", () => {
    expect(
      editFoodEntrySchema.safeParse({
        ...validPayload,
        loggedAt: "2020-03-01T12:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("rejects a future loggedAt", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(
      editFoodEntrySchema.safeParse({ ...validPayload, loggedAt: future })
        .success,
    ).toBe(false);
  });

  it("accepts a legacy unit so older entries stay editable", () => {
    expect(
      editFoodEntrySchema.safeParse({ ...validPayload, unit: "ml" }).success,
    ).toBe(true);
  });

  it("rejects an empty unit or unknown meal type", () => {
    expect(
      editFoodEntrySchema.safeParse({ ...validPayload, unit: "" }).success,
    ).toBe(false);
    expect(
      editFoodEntrySchema.safeParse({ ...validPayload, mealType: "brunch" })
        .success,
    ).toBe(false);
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
