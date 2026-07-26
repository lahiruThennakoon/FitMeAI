import { z } from "zod";

const mealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "unknown",
]);

export const instantFoodSchema = z.object({
  clientKey: z.string().min(8).max(80),
  foodSlug: z.string().trim().min(1).max(80),
  quantity: z.number().positive().max(10_000),
  unit: z.enum(["g", "piece", "serving", "cup", "bowl", "plate"]),
  mealType: mealTypeSchema.optional().default("unknown"),
  loggedAt: z.string().datetime().optional(),
});

export const reconcileOfflineQueueSchema = z.object({
  items: z
    .array(
      z.object({
        clientKey: z.string().min(8).max(80),
        foodSlug: z.string().trim().min(1).max(80),
        quantity: z.number().positive().max(10_000),
        unit: z.enum(["g", "piece", "serving", "cup", "bowl", "plate"]),
        mealType: mealTypeSchema.optional().default("unknown"),
        loggedAt: z.string().datetime(),
      }),
    )
    .max(50),
});

export type InstantFoodInput = z.infer<typeof instantFoodSchema>;
