import { z } from "zod";

export const parseMealInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Describe what you ate")
    .max(1000, "Keep your description under 1000 characters"),
});

export type ParseMealInput = z.infer<typeof parseMealInputSchema>;
