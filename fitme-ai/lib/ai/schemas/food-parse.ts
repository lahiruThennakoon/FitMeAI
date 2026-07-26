import { z } from "zod";

/** Meal types inferred or set on a log item (FR-12 defaults). */
export const mealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "unknown",
]);

export const foodParseUnitSchema = z.enum([
  "g",
  "piece",
  "cup",
  "tablespoon",
  "bowl",
  "plate",
  "serving",
]);

const nullableMacro = z.number().finite().nonnegative().nullable();

/**
 * Schema-validated AI output for NL food parsing (Story 2.3 / FR-6 / FR-18).
 * Macros in `estimate` are only used when no catalog match exists.
 */
export const foodParseAiSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        quantity: z.number().positive().max(10_000),
        unit: foodParseUnitSchema,
        mealType: mealTypeSchema.optional(),
        confidence: z.number().min(0).max(1),
        /** Hint for Story 2.5 clarifying chips (typically portion). */
        needsClarification: z.boolean().optional(),
        /** Optional AI macros when food is unknown to the catalog. */
        estimate: z
          .object({
            energyKcal: nullableMacro,
            proteinG: nullableMacro,
            carbsG: nullableMacro,
            fatG: nullableMacro,
            fibreG: nullableMacro,
            sugarG: nullableMacro,
            sodiumMg: nullableMacro,
          })
          .optional(),
      }),
    )
    .min(1)
    .max(20),
  inferredMealType: mealTypeSchema.optional(),
});

export type FoodParseAiOutput = z.infer<typeof foodParseAiSchema>;

/** Gemini responseSchema hint — Zod remains the authority. */
export const foodParseResponseSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "number" },
          unit: {
            type: "string",
            enum: [
              "g",
              "piece",
              "cup",
              "tablespoon",
              "bowl",
              "plate",
              "serving",
            ],
          },
          mealType: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack", "unknown"],
          },
          confidence: { type: "number" },
          needsClarification: { type: "boolean" },
          estimate: {
            type: "object",
            properties: {
              energyKcal: { type: "number", nullable: true },
              proteinG: { type: "number", nullable: true },
              carbsG: { type: "number", nullable: true },
              fatG: { type: "number", nullable: true },
              fibreG: { type: "number", nullable: true },
              sugarG: { type: "number", nullable: true },
              sodiumMg: { type: "number", nullable: true },
            },
          },
        },
        required: ["name", "quantity", "unit", "confidence"],
      },
    },
    inferredMealType: {
      type: "string",
      enum: ["breakfast", "lunch", "dinner", "snack", "unknown"],
    },
  },
  required: ["items"],
} as const;

export const FOOD_PARSE_SYSTEM = [
  "You parse meal descriptions into structured food items for a nutrition tracker.",
  "Prefer common Sri Lankan food names when appropriate (e.g. pol sambol, dhal curry, milk tea, dhal wade).",
  "Use unit g for gram amounts; piece for countable items; cup/bowl/plate/serving when natural.",
  "Set needsClarification true when quantity/portion is ambiguous.",
  "Include estimate macros only when the food is uncommon or likely missing from a local catalog; otherwise omit estimate.",
  "Never give medical advice. Never invent certainty — lower confidence when unsure.",
].join(" ");
