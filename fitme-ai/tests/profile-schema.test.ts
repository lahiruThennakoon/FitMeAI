import { describe, it, expect } from "vitest";
import { saveProfileSchema } from "@/lib/schemas/profile";

const validMetric = {
  displayName: "Nimali",
  ageYears: 28,
  sex: "female" as const,
  height: 165,
  currentWeight: 62,
  targetWeight: 58,
  activityLevel: "moderately_active" as const,
  dietaryPreferences: ["vegetarian"],
  goalType: "weight_loss" as const,
  preferredUnits: "metric" as const,
  country: "Sri Lanka",
  timezone: "Asia/Colombo",
};

describe("saveProfileSchema", () => {
  it("accepts a valid metric profile", () => {
    expect(saveProfileSchema.safeParse(validMetric).success).toBe(true);
  });

  it("rejects age 0", () => {
    const result = saveProfileSchema.safeParse({ ...validMetric, ageYears: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects implausible metric height", () => {
    const result = saveProfileSchema.safeParse({ ...validMetric, height: 50 });
    expect(result.success).toBe(false);
  });

  it("accepts an omitted country", () => {
    const { country: _country, ...withoutCountry } = validMetric;
    const result = saveProfileSchema.safeParse(withoutCountry);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.country).toBe("");
  });
});
