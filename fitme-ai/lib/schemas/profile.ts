import { z } from "zod";

export const sexSchema = z.enum(["male", "female"]);
export const activityLevelSchema = z.enum([
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extra_active",
]);
export const goalTypeSchema = z.enum([
  "weight_loss",
  "maintenance",
  "muscle_gain",
  "general_health",
]);
export const preferredUnitsSchema = z.enum(["metric", "imperial"]);

/** Optional override: finite, non-negative, with a sane ceiling. */
function overrideField(max: number) {
  return z.number().finite().min(0).max(max).optional();
}

function isValidIanaTimezone(tz: string): boolean {
  try {
    if (
      typeof Intl !== "undefined" &&
      "supportedValuesOf" in Intl &&
      typeof Intl.supportedValuesOf === "function"
    ) {
      return Intl.supportedValuesOf("timeZone").includes(tz);
    }
    // Fallback: accept if DateTimeFormat accepts it without throwing.
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Profile + optional target overrides from the goals form.
 * Height/weight arrive in the user's preferred units; action converts to canonical.
 */
export const saveProfileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Enter your name.")
      .max(80, "Name must be at most 80 characters."),
    ageYears: z
      .number()
      .int("Enter a whole number for age.")
      .min(13, "You must be at least 13.")
      .max(120, "Enter a realistic age."),
    sex: sexSchema,
    height: z.number().finite().positive("Enter your height."),
    currentWeight: z.number().finite().positive("Enter your current weight."),
    targetWeight: z.number().finite().positive("Enter your target weight."),
    activityLevel: activityLevelSchema,
    dietaryPreferences: z
      .array(z.string().trim().min(1).max(40))
      .max(20)
      .default([]),
    goalType: goalTypeSchema,
    preferredUnits: preferredUnitsSchema,
    country: z
      .string()
      .trim()
      .min(2, "Enter your country.")
      .max(80, "Country must be at most 80 characters."),
    timezone: z
      .string()
      .trim()
      .min(1, "Choose a timezone.")
      .refine(isValidIanaTimezone, {
        message: "Choose a valid timezone (e.g. Asia/Colombo).",
      }),
    overrides: z
      .object({
        caloriesKcal: overrideField(20_000),
        proteinG: overrideField(1_000),
        carbsG: overrideField(2_000),
        fatG: overrideField(1_000),
        fibreG: overrideField(200),
        waterMl: overrideField(20_000),
        steps: overrideField(100_000),
        exerciseMinutes: overrideField(600),
        weeklyWeightChangeG: z
          .number()
          .finite()
          .min(-5_000)
          .max(5_000)
          .optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.preferredUnits === "metric") {
      if (data.height < 100 || data.height > 250) {
        ctx.addIssue({
          code: "custom",
          path: ["height"],
          message: "Height should be between 100 and 250 cm.",
        });
      }
      if (data.currentWeight < 30 || data.currentWeight > 400) {
        ctx.addIssue({
          code: "custom",
          path: ["currentWeight"],
          message: "Weight should be between 30 and 400 kg.",
        });
      }
      if (data.targetWeight < 30 || data.targetWeight > 400) {
        ctx.addIssue({
          code: "custom",
          path: ["targetWeight"],
          message: "Target weight should be between 30 and 400 kg.",
        });
      }
    } else {
      // Align imperial floors/ceilings with metric after conversion (~2.54 cm/in, ~2.205 lb/kg).
      if (data.height < 40 || data.height > 98) {
        ctx.addIssue({
          code: "custom",
          path: ["height"],
          message: "Height should be between 40 and 98 in.",
        });
      }
      if (data.currentWeight < 67 || data.currentWeight > 881) {
        ctx.addIssue({
          code: "custom",
          path: ["currentWeight"],
          message: "Weight should be between 67 and 881 lb.",
        });
      }
      if (data.targetWeight < 67 || data.targetWeight > 881) {
        ctx.addIssue({
          code: "custom",
          path: ["targetWeight"],
          message: "Target weight should be between 67 and 881 lb.",
        });
      }
    }
  });

export type SaveProfileInput = z.infer<typeof saveProfileSchema>;
