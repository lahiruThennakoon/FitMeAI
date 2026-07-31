import { z } from "zod";
import {
  catalogLocaleHint,
  type CatalogLocale,
} from "@/lib/domain/nutrition/catalog-locale";

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

/** Null/omitted → 0 so negligible fibre/sugar aren't left blank in the UI. */
const zeroDefaultMacro = z
  .number()
  .finite()
  .nonnegative()
  .nullish()
  .transform((v) => (v == null ? 0 : v));

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
            fibreG: zeroDefaultMacro,
            sugarG: zeroDefaultMacro,
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
/** Pre-transform shape (allows null fibre/sugar from the model). */
export type FoodParseAiInput = z.input<typeof foodParseAiSchema>;

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
            required: [
              "energyKcal",
              "proteinG",
              "carbsG",
              "fatG",
              "fibreG",
              "sugarG",
              "sodiumMg",
            ],
          },
        },
        required: ["name", "quantity", "unit", "confidence", "estimate"],
      },
    },
    inferredMealType: {
      type: "string",
      enum: ["breakfast", "lunch", "dinner", "snack", "unknown"],
    },
  },
  required: ["items"],
} as const;

export function buildFoodParseSystemPrompt(
  locale: CatalogLocale = "global",
): string {
  const regional = catalogLocaleHint(locale);
  return [
    "You parse meal descriptions into structured food items for a nutrition tracker.",
    `Prefer common ${regional} food names when appropriate.`,
    "Use unit g for gram amounts; piece for countable items; cup/bowl/plate/serving when natural.",
    "Set needsClarification true when quantity/portion is ambiguous.",
    "Always include an estimate object for every item with energyKcal, proteinG, carbsG, fatG, fibreG, sugarG, sodiumMg for the given quantity.",
    "Prefer typical numeric values. Use 0 when a nutrient is negligible (e.g. fibre and sugar in meat, liver, eggs, fish) — do not leave those as null.",
    "Use null only for calories/protein/carbs/fat/sodium when you truly cannot estimate.",
    "Item names must be food names only — never diagnoses, advice, or judgment.",
    "Estimates are approximate; never claim database, lab, or medical precision in names or notes.",
    "Lower confidence when unsure, but still provide best-effort numbers.",
  ].join(" ");
}

/** Default prompt when locale is unknown (tests / fallback). */
export const FOOD_PARSE_SYSTEM = buildFoodParseSystemPrompt("global");
