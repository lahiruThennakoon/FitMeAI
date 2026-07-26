import "server-only";
import type { z } from "zod";
import { parseAndValidate } from "@/lib/ai/parse";
import {
  AI_SAFE_ERRORS,
  type AiProvider,
  type AiResult,
  type GenerateStructuredInput,
  type GenerateStructuredOptions,
} from "@/lib/ai/types";
import { purposeForLog } from "@/lib/ai/log-meta";
import { logger } from "@/lib/logging";

export const GEMINI_DEFAULT_MODEL = "gemini-2.0-flash";
export const GEMINI_DEFAULT_TIMEOUT_MS = 20_000;

export type GeminiAiProviderDeps = {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string; code?: number };
};

function combineSignals(
  timeoutMs: number,
  external?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);

  const onExternalAbort = () => controller.abort("aborted");
  if (external) {
    if (external.aborted) controller.abort("aborted");
    else external.addEventListener("abort", onExternalAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      external?.removeEventListener("abort", onExternalAbort);
    },
  };
}

/**
 * Google Gemini adapter via REST generateContent (AD-4).
 * Validates every response with Zod before returning data.
 */
export class GeminiAiProvider implements AiProvider {
  readonly id = "gemini";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(deps: GeminiAiProviderDeps) {
    this.apiKey = deps.apiKey;
    this.model = deps.model?.trim() || GEMINI_DEFAULT_MODEL;
    this.timeoutMs = deps.timeoutMs ?? GEMINI_DEFAULT_TIMEOUT_MS;
    this.fetchImpl = deps.fetchImpl ?? fetch;
  }

  async generateStructured<T>(
    input: GenerateStructuredInput,
    schema: z.ZodType<T>,
    options?: GenerateStructuredOptions,
  ): Promise<AiResult<T>> {
    if (!this.apiKey.trim()) {
      return {
        ok: false,
        code: "not_configured",
        error: AI_SAFE_ERRORS.not_configured,
      };
    }

    const timeoutMs = options?.timeoutMs ?? this.timeoutMs;
    const { signal, cleanup } = combineSignals(timeoutMs, options?.signal);
    const purpose = purposeForLog(input.purpose);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;

    const systemBits = [
      input.systemInstruction?.trim(),
      "Respond with a single JSON value only. No markdown or commentary.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const body: Record<string, unknown> = {
      contents: [
        {
          role: "user",
          parts: [{ text: input.userPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        ...(input.responseSchema
          ? { responseSchema: input.responseSchema }
          : {}),
      },
    };

    if (systemBits) {
      body.systemInstruction = {
        parts: [{ text: systemBits }],
      };
    }

    try {
      const res = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        logger.error("ai.gemini.http_error", {
          event: "ai_provider_error",
          purpose,
          providerId: this.id,
          status: res.status,
        });
        return {
          ok: false,
          code: "provider_error",
          error: AI_SAFE_ERRORS.provider_error,
        };
      }

      let payload: GeminiResponse;
      try {
        payload = (await res.json()) as GeminiResponse;
      } catch {
        logger.error("ai.gemini.invalid_http_json", {
          event: "ai_provider_error",
          purpose,
          providerId: this.id,
        });
        return {
          ok: false,
          code: "provider_error",
          error: AI_SAFE_ERRORS.provider_error,
        };
      }

      const rawText =
        payload.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("")
          .trim() ?? "";

      if (!rawText) {
        logger.warn("ai.gemini.empty", {
          event: "ai_validation_failed",
          purpose,
          providerId: this.id,
          code: "validation_failed",
        });
        return {
          ok: false,
          code: "validation_failed",
          error: AI_SAFE_ERRORS.validation_failed,
        };
      }

      const validated = parseAndValidate(rawText, schema, {
        providerId: this.id,
        model: this.model,
      });

      if (!validated.ok) {
        logger.warn("ai.gemini.validation_failed", {
          event: "ai_validation_failed",
          purpose,
          providerId: this.id,
          code: validated.code,
        });
      }

      return validated;
    } catch (e) {
      const abortReason =
        typeof signal.reason === "string" ? signal.reason : undefined;
      const isAbort =
        signal.aborted ||
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");

      if (isAbort) {
        const code =
          abortReason === "aborted" || options?.signal?.aborted
            ? "aborted"
            : "timeout";
        logger.warn("ai.gemini.abort", {
          event: "ai_timeout_or_abort",
          purpose,
          providerId: this.id,
          code,
        });
        return {
          ok: false,
          code,
          error: AI_SAFE_ERRORS[code],
        };
      }

      logger.error("ai.gemini.provider_error", {
        event: "ai_provider_error",
        purpose,
        providerId: this.id,
      });
      return {
        ok: false,
        code: "provider_error",
        error: AI_SAFE_ERRORS.provider_error,
      };
    } finally {
      cleanup();
    }
  }
}
