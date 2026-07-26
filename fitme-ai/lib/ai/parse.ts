import type { z } from "zod";
import { AI_SAFE_ERRORS, type AiFailure, type AiSuccess } from "@/lib/ai/types";

/**
 * Extract a JSON document from model text (plain JSON or fenced ```json blocks).
 */
export function extractJsonText(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;

  const objectStart = trimmed.indexOf("{");
  const arrayStart = trimmed.indexOf("[");
  const startCandidates = [objectStart, arrayStart].filter((i) => i >= 0);
  if (startCandidates.length === 0) return null;
  const start = Math.min(...startCandidates);
  return trimmed.slice(start).trim();
}

/**
 * Parse raw model text and validate with Zod. Fail-safe: never throws.
 */
export function parseAndValidate<T>(
  rawText: string,
  schema: z.ZodType<T>,
  meta: { providerId: string; model: string },
): AiSuccess<T> | AiFailure {
  const jsonText = extractJsonText(rawText);
  if (jsonText === null) {
    return {
      ok: false,
      code: "validation_failed",
      error: AI_SAFE_ERRORS.validation_failed,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      ok: false,
      code: "validation_failed",
      error: AI_SAFE_ERRORS.validation_failed,
    };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      code: "validation_failed",
      error: AI_SAFE_ERRORS.validation_failed,
    };
  }

  return {
    ok: true,
    data: result.data,
    meta: {
      providerId: meta.providerId,
      model: meta.model,
      rawText,
    },
  };
}
