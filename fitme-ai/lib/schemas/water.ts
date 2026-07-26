import { z } from "zod";

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
  loggedAt: z.string().datetime().optional(),
});

export type SaveWaterEntryInput = z.infer<typeof saveWaterEntrySchema>;
