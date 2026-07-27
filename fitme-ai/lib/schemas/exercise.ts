import { z } from "zod";
import {
  EXERCISE_INTENSITIES,
  EXERCISE_TYPES,
} from "@/lib/domain/burn/exercise-estimate";

export const exerciseTypeSchema = z.enum(EXERCISE_TYPES);
export const exerciseIntensitySchema = z.enum(EXERCISE_INTENSITIES);

export const saveExerciseEntrySchema = z
  .object({
    type: exerciseTypeSchema,
    customLabel: z.string().trim().max(80).optional().nullable(),
    durationMin: z
      .number()
      .finite()
      .positive("Duration must be greater than zero")
      .max(24 * 60, "Keep duration under 24 hours"),
    intensity: exerciseIntensitySchema,
    distanceM: z
      .number()
      .finite()
      .nonnegative()
      .max(500_000)
      .optional()
      .nullable(),
    sets: z.number().int().positive().max(100).optional().nullable(),
    reps: z.number().int().positive().max(1000).optional().nullable(),
    /** Equipment / load weight in grams (canonical). */
    weightG: z.number().int().nonnegative().max(500_000).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
    performedAt: z.string().datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "custom") {
      const label = data.customLabel?.trim() ?? "";
      if (label.length < 1) {
        ctx.addIssue({
          code: "custom",
          message: "Name your custom exercise",
          path: ["customLabel"],
        });
      }
    }
  });

export type SaveExerciseEntryInput = z.infer<typeof saveExerciseEntrySchema>;

/**
 * Compact Home edit payload (Story 5.3) — type / duration / intensity only.
 * Optional create fields stay out of the inline form.
 */
export const editExerciseEntrySchema = z
  .object({
    type: exerciseTypeSchema,
    customLabel: z.string().trim().max(80).optional().nullable(),
    // int so Math.round cannot turn a Zod-accepted fraction (e.g. 0.4) into 0
    durationMin: z
      .number()
      .finite()
      .int("Duration must be a whole number of minutes")
      .positive("Duration must be greater than zero")
      .max(24 * 60, "Keep duration under 24 hours"),
    intensity: exerciseIntensitySchema,
  })
  .superRefine((data, ctx) => {
    if (data.type === "custom") {
      const label = data.customLabel?.trim() ?? "";
      if (label.length < 1) {
        ctx.addIssue({
          code: "custom",
          message: "Name your custom exercise",
          path: ["customLabel"],
        });
      }
    }
  });

export type EditExerciseEntryInput = z.infer<typeof editExerciseEntrySchema>;
