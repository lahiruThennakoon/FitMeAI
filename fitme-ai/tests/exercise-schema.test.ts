import { describe, it, expect } from "vitest";
import {
  editExerciseEntrySchema,
  saveExerciseEntrySchema,
} from "@/lib/schemas/exercise";

describe("saveExerciseEntrySchema", () => {
  it("accepts a valid walking log", () => {
    const parsed = saveExerciseEntrySchema.safeParse({
      type: "walking",
      durationMin: 30,
      intensity: "moderate",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects zero duration", () => {
    const parsed = saveExerciseEntrySchema.safeParse({
      type: "cycling",
      durationMin: 0,
      intensity: "low",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires custom label for custom type", () => {
    const missing = saveExerciseEntrySchema.safeParse({
      type: "custom",
      durationMin: 20,
      intensity: "high",
      customLabel: "",
    });
    expect(missing.success).toBe(false);

    const ok = saveExerciseEntrySchema.safeParse({
      type: "custom",
      durationMin: 20,
      intensity: "high",
      customLabel: "HIIT circuit",
    });
    expect(ok.success).toBe(true);
  });
});

describe("editExerciseEntrySchema (Story 5.3)", () => {
  const performedAt = "2026-07-25T18:30:00.000Z";

  it("accepts a compact edit payload", () => {
    const parsed = editExerciseEntrySchema.safeParse({
      type: "cycling",
      durationMin: 40,
      intensity: "high",
      performedAt,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts the optional detail fields", () => {
    const parsed = editExerciseEntrySchema.safeParse({
      type: "running",
      durationMin: 40,
      intensity: "high",
      performedAt,
      distanceM: 8000,
      sets: 3,
      reps: 12,
      weightG: 20_000,
      notes: "Felt easy",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects zero duration", () => {
    const parsed = editExerciseEntrySchema.safeParse({
      type: "walking",
      durationMin: 0,
      intensity: "moderate",
      performedAt,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects fractional duration", () => {
    const parsed = editExerciseEntrySchema.safeParse({
      type: "walking",
      durationMin: 0.4,
      intensity: "moderate",
      performedAt,
    });
    expect(parsed.success).toBe(false);
  });

  it("allows backdating but rejects a future performedAt", () => {
    expect(
      editExerciseEntrySchema.safeParse({
        type: "walking",
        durationMin: 30,
        intensity: "moderate",
        performedAt: "2020-01-01T10:00:00.000Z",
      }).success,
    ).toBe(true);

    expect(
      editExerciseEntrySchema.safeParse({
        type: "walking",
        durationMin: 30,
        intensity: "moderate",
        performedAt: new Date(Date.now() + 3_600_000).toISOString(),
      }).success,
    ).toBe(false);
  });

  it("requires custom label for custom type", () => {
    const missing = editExerciseEntrySchema.safeParse({
      type: "custom",
      durationMin: 20,
      intensity: "high",
      customLabel: "  ",
      performedAt,
    });
    expect(missing.success).toBe(false);

    const ok = editExerciseEntrySchema.safeParse({
      type: "custom",
      durationMin: 20,
      intensity: "high",
      customLabel: "Boxing",
      performedAt,
    });
    expect(ok.success).toBe(true);
  });
});
