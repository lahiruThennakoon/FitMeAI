import { z } from "zod";

export const parseMealInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Describe what you ate")
    .max(1000, "Keep your description under 1000 characters"),
});

export type ParseMealInput = z.infer<typeof parseMealInputSchema>;

const nutritionSchema = z.object({
  energyKcal: z.number().finite().min(0).nullable(),
  proteinG: z.number().finite().min(0).nullable(),
  carbsG: z.number().finite().min(0).nullable(),
  fatG: z.number().finite().min(0).nullable(),
  fibreG: z.number().finite().min(0).nullable(),
  sugarG: z.number().finite().min(0).nullable(),
  sodiumMg: z.number().finite().min(0).nullable(),
});

const mealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "unknown",
]);

const unitSchema = z.enum([
  "g",
  "piece",
  "cup",
  "tablespoon",
  "bowl",
  "plate",
  "serving",
]);

const aiSnapshotSchema = z.object({
  name: z.string().min(1).max(120),
  quantity: z.number().positive().max(10_000),
  unit: unitSchema,
  mealType: mealTypeSchema,
  nutrition: nutritionSchema,
});

const breakdownLineSchema = z.object({
  ingredientSlug: z.string(),
  name: z.string(),
  grams: z.number(),
  proportionPct: z.number(),
  contribution: nutritionSchema,
  per100g: nutritionSchema,
  dataSource: z.enum(["database", "ai_estimated"]),
});

export const saveMealDraftItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  quantity: z.number().positive().max(10_000),
  unit: unitSchema,
  mealType: mealTypeSchema,
  loggedAt: z.string().datetime(),
  dataSource: z.enum(["database", "ai_estimated"]),
  confidence: z.number().min(0).max(1),
  needsClarification: z.boolean(),
  nutrition: nutritionSchema,
  foodSlug: z.string().nullable(),
  catalog: z
    .object({
      defaultServingG: z.number().positive(),
      nutritionAtDefault: nutritionSchema,
      servings: z.array(
        z.object({ name: z.string(), grams: z.number().positive() }),
      ),
    })
    .nullable(),
  breakdown: z.array(breakdownLineSchema).nullable(),
  kind: z.enum(["simple", "composite", "estimated"]),
  origin: z.enum(["ai_parse", "manual"]),
  aiSnapshot: aiSnapshotSchema.nullable(),
  note: z
    .string()
    .trim()
    .max(500, "Keep the note under 500 characters")
    .optional()
    .nullable(),
});

/**
 * Explicit confirm required — AI drafts never persist without this (FR-9).
 */
export const saveMealDraftSchema = z
  .object({
    confirmed: z.literal(true),
    items: z.array(saveMealDraftItemSchema).min(1).max(20),
    /** Links saved entries to the parse AIInteraction (FR-19). */
    aiInteractionId: z.string().min(1).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const ids = data.items.map((i) => i.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message: "Duplicate draft ids",
        path: ["items"],
      });
    }
    data.items.forEach((item, index) => {
      if (item.origin === "ai_parse" && item.aiSnapshot === null) {
        ctx.addIssue({
          code: "custom",
          message: "AI drafts require an original snapshot",
          path: ["items", index, "aiSnapshot"],
        });
      }
    });
  });

export type SaveMealDraftInput = z.infer<typeof saveMealDraftSchema>;

/** Rematch a draft name against the catalog (FR-11 — prefer DB when found). */
export const rematchFoodDraftSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  quantity: z.number().positive().max(10_000),
  unit: unitSchema,
  mealType: mealTypeSchema,
  loggedAt: z.string().datetime(),
  confidence: z.number().min(0).max(1),
  origin: z.enum(["ai_parse", "manual"]),
  aiSnapshot: aiSnapshotSchema.nullable(),
  nutrition: nutritionSchema,
});

export type RematchFoodDraftInput = z.infer<typeof rematchFoodDraftSchema>;
