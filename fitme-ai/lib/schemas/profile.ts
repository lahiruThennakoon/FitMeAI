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

const overrideNumber = z.number().finite().optional();

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
    height: z
      .number()
      .finite()
      .positive("Enter your height."),
    currentWeight: z
      .number()
      .finite()
      .positive("Enter your current weight."),
    targetWeight: z
      .number()
      .finite()
      .positive("Enter your target weight."),
    activityLevel: activityLevelSchema,
    dietaryPreferences: z.array(z.string().trim().min(1)).max(20).default([]),
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
      .min(1, "Choose a timezone."),
    overrides: z
      .object({
        caloriesKcal: overrideNumber,
        proteinG: overrideNumber,
        carbsG: overrideNumber,
        fatG: overrideNumber,
        fibreG: overrideNumber,
        waterMl: overrideNumber,
        steps: overrideNumber,
        exerciseMinutes: overrideNumber,
        weeklyWeightChangeG: overrideNumber,
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
      if (data.height < 39 || data.height > 98) {
        ctx.addIssue({
          code: "custom",
          path: ["height"],
          message: "Height should be between 39 and 98 in.",
        });
      }
      if (data.currentWeight < 66 || data.currentWeight > 880) {
        ctx.addIssue({
          code: "custom",
          path: ["currentWeight"],
          message: "Weight should be between 66 and 880 lb.",
        });
      }
      if (data.targetWeight < 66 || data.targetWeight > 880) {
        ctx.addIssue({
          code: "custom",
          path: ["targetWeight"],
          message: "Target weight should be between 66 and 880 lb.",
        });
      }
    }
  });

export type SaveProfileInput = z.infer<typeof saveProfileSchema>;
