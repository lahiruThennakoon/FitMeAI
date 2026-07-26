import { z } from "zod";

/**
 * Minimal structured schema used by Story 2.2 tests and the fake default.
 * Real food-parse schemas land in Story 2.3.
 */
export const structuredEchoSchema = z.object({
  ok: z.literal(true),
  echo: z.string().min(1),
});

export type StructuredEcho = z.infer<typeof structuredEchoSchema>;

/** Gemini responseSchema hint (OpenAPI-ish). Zod remains the authority. */
export const structuredEchoResponseSchema = {
  type: "object",
  properties: {
    ok: { type: "boolean" },
    echo: { type: "string" },
  },
  required: ["ok", "echo"],
} as const;
