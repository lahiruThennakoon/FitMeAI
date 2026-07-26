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

export const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";
export const OPENAI_DEFAULT_TIMEOUT_MS = 20_000;

export type OpenAiProviderDeps = {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

type OpenAiChatResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string; type?: string };
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
 * OpenAI Chat Completions adapter (AD-4).
 * Uses JSON object mode; Zod remains the validation authority.
 */
export class OpenAiProvider implements AiProvider {
  readonly id = "openai";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(deps: OpenAiProviderDeps) {
    this.apiKey = deps.apiKey;
    this.model = deps.model?.trim() || OPENAI_DEFAULT_MODEL;
    this.timeoutMs = deps.timeoutMs ?? OPENAI_DEFAULT_TIMEOUT_MS;
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

    const systemBits = [
      input.systemInstruction?.trim(),
      "Respond with a single JSON object only. No markdown or commentary.",
      input.responseSchema
        ? `Match this JSON shape: ${JSON.stringify(input.responseSchema)}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const body = {
      model: this.model,
      messages: [
        ...(systemBits
          ? [{ role: "system" as const, content: systemBits }]
          : []),
        { role: "user" as const, content: input.userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    };

    try {
      const res = await this.fetchImpl(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal,
        },
      );

      if (!res.ok) {
        logger.error("ai.openai.http_error", {
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

      let payload: OpenAiChatResponse;
      try {
        payload = (await res.json()) as OpenAiChatResponse;
      } catch {
        logger.error("ai.openai.invalid_http_json", {
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

      const rawText = payload.choices?.[0]?.message?.content?.trim() ?? "";

      if (!rawText) {
        logger.warn("ai.openai.empty", {
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
        logger.warn("ai.openai.validation_failed", {
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
        logger.warn("ai.openai.abort", {
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

      logger.error("ai.openai.provider_error", {
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
