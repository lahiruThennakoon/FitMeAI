import { z } from "zod";
import { FUTURE_TIME_MESSAGE, isNotFutureIso } from "@/lib/domain/log-time";

/**
 * Water logging (Story 5.1 / FR-15). Amounts are exact user input, not an
 * estimate — no "estimate" labeling needed (unlike exercise burn).
 */
export const saveWaterEntrySchema = z.object({
  amountMl: z
    .number()
    .int()
    .positive("Amount must be greater than zero")
    .max(5000, "Keep a single log under 5000 ml"),
  loggedAt: z
    .string()
    .datetime()
    .refine(isNotFutureIso, { message: FUTURE_TIME_MESSAGE })
    .optional(),
});

export type SaveWaterEntryInput = z.infer<typeof saveWaterEntrySchema>;
