import { z } from "zod";

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
  energyKcal: z.number().finite().nonnegative().max(20_000).nullable(),
  proteinG: z.number().finite().nonnegative().max(2000).nullable(),
  carbsG: z.number().finite().nonnegative().max(2000).nullable(),
  fatG: z.number().finite().nonnegative().max(2000).nullable(),
  fibreG: z.number().finite().nonnegative().max(500).nullable(),
  sugarG: z.number().finite().nonnegative().max(2000).nullable(),
});

export type EditFoodEntryInput = z.infer<typeof editFoodEntrySchema>;
