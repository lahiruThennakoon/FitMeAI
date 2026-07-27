import { z } from "zod";

/** Canonical grams after unit conversion at the edge (AD-11). */
export const saveWeightEntrySchema = z.object({
  weightG: z
    .number()
    .finite()
    .int("Use a whole number of grams after conversion")
    .min(20_000, "That weight looks too low")
    .max(500_000, "That weight looks too high"),
  note: z.string().trim().max(200).optional().nullable(),
  recordedAt: z.string().datetime().optional(),
});

export type SaveWeightEntryInput = z.infer<typeof saveWeightEntrySchema>;
