import { describe, it, expect } from "vitest";
import { saveExerciseEntrySchema } from "@/lib/schemas/exercise";

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
