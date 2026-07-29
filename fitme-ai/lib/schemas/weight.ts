import { z } from "zod";
import { FUTURE_TIME_MESSAGE, isNotFutureIso } from "@/lib/domain/log-time";

/** Canonical grams after unit conversion at the edge (AD-11). */
export const saveWeightEntrySchema = z.object({
  weightG: z
    .number()
    .finite()
    .int("Use a whole number of grams after conversion")
    .min(20_000, "That weight looks too low")
    .max(500_000, "That weight looks too high"),
  note: z.string().trim().max(200).optional().nullable(),
  recordedAt: z
    .string()
    .datetime()
    .refine(isNotFutureIso, { message: FUTURE_TIME_MESSAGE })
    .optional(),
});

export type SaveWeightEntryInput = z.infer<typeof saveWeightEntrySchema>;

/** Correcting a saved weigh-in — the date is explicit rather than defaulted. */
export const editWeightEntrySchema = saveWeightEntrySchema.extend({
  recordedAt: z
    .string()
    .datetime()
    .refine(isNotFutureIso, { message: FUTURE_TIME_MESSAGE }),
});

export type EditWeightEntryInput = z.infer<typeof editWeightEntrySchema>;
