import { z } from "zod";
import { FUTURE_TIME_MESSAGE, isNotFutureIso } from "@/lib/domain/log-time";

/**
 * Saved entries may carry legacy units (e.g. imported "ml"). The edit form keeps
 * those selectable; reject only empty/oversized values, not the enum list.
 */
const unitSchema = z
  .string()
  .trim()
  .min(1, "Choose a unit.")
  .max(40, "Unit must be at most 40 characters.");

const mealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "unknown",
]);

/**
 * Edit an already-saved meal entry (Story 5.2 / FR-9 correction path).
 * Macros stay nullable — "unknown" is never coerced to 0 (see
 * lib/domain/nutrition/types.ts NutritionMacros).
 */
export const editFoodEntrySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Keep the name under 120 characters"),
  quantity: z
    .number()
    .finite()
    .positive("Quantity must be greater than zero")
    .max(1000, "Keep quantity under 1000"),
  unit: unitSchema,
  mealType: mealTypeSchema,
  /** Backdating is allowed so a mis-timed meal can move to the right day. */
  loggedAt: z
    .string()
    .datetime()
    .refine(isNotFutureIso, { message: FUTURE_TIME_MESSAGE }),
  energyKcal: z.number().finite().nonnegative().max(20_000).nullable(),
  proteinG: z.number().finite().nonnegative().max(2000).nullable(),
  carbsG: z.number().finite().nonnegative().max(2000).nullable(),
  fatG: z.number().finite().nonnegative().max(2000).nullable(),
  fibreG: z.number().finite().nonnegative().max(500).nullable(),
  sugarG: z.number().finite().nonnegative().max(2000).nullable(),
  sodiumMg: z.number().finite().nonnegative().max(100_000).nullable(),
  /**
   * Required-nullable like the macros: this edit is a full replace, so an
   * omitted note would silently clear one the user had written.
   */
  note: z
    .string()
    .trim()
    .max(500, "Keep the note under 500 characters")
    .nullable(),
});

export type EditFoodEntryInput = z.infer<typeof editFoodEntrySchema>;
