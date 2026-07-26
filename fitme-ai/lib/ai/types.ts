import type { z } from "zod";

/**
 * Provider-agnostic AI port (Story 2.2 / AD-4 / FR-18).
 * Call sites depend only on this interface — swap adapters via config.
 */

export type AiFailureCode =
  | "validation_failed"
  | "timeout"
  | "provider_error"
  | "not_configured"
  | "aborted";

/** Safe user-facing copy — never include raw provider payloads. */
export const AI_SAFE_ERRORS: Record<AiFailureCode, string> = {
  validation_failed:
    "We couldn't understand the AI response. Please retry or enter manually.",
  timeout: "The AI request timed out. Please retry or enter manually.",
  provider_error:
    "The AI service is unavailable right now. Please retry or enter manually.",
  not_configured:
    "AI is not configured. Please enter manually or set up the AI provider.",
  aborted: "The AI request was cancelled. Please retry or enter manually.",
};

export type AiSuccess<T> = {
  ok: true;
  data: T;
  meta: {
    providerId: string;
    model: string;
    /** Raw model text for audit (Story 2.10) — never log. */
    rawText: string;
  };
};

export type AiFailure = {
  ok: false;
  code: AiFailureCode;
  error: string;
};

export type AiResult<T> = AiSuccess<T> | AiFailure;

export type GenerateStructuredInput = {
  /** Logical purpose (e.g. food_parse) — safe to log as a label only. */
  purpose: string;
  systemInstruction?: string;
  userPrompt: string;
  /**
   * Optional OpenAPI-ish JSON Schema hint for providers that support
   * native structured output. Zod `schema` remains the validation authority.
   */
  responseSchema?: Record<string, unknown>;
};

export type GenerateStructuredOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
};

export interface AiProvider {
  readonly id: string;
  generateStructured<T>(
    input: GenerateStructuredInput,
    schema: z.ZodType<T>,
    options?: GenerateStructuredOptions,
  ): Promise<AiResult<T>>;
}
