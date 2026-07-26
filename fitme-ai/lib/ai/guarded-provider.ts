import "server-only";
import type { z } from "zod";
import {
  GUARDRAIL_REGEN_HINT,
  SAFETY_SYSTEM_INSTRUCTION,
  checkAiOutput,
} from "@/lib/ai/guardrails";
import { purposeForLog } from "@/lib/ai/log-meta";
import { logger } from "@/lib/logging";
import {
  AI_SAFE_ERRORS,
  type AiProvider,
  type AiResult,
  type GenerateStructuredInput,
  type GenerateStructuredOptions,
} from "@/lib/ai/types";

export type GuardedAiProviderOptions = {
  /** Total attempts including the first (default 2 = one regeneration). */
  maxAttempts?: number;
};

/**
 * Wraps any AiProvider with FR-17 / AD-5 guardrails:
 * inject safety system rules, check output, regenerate bounded, then safe-fail.
 */
export class GuardedAiProvider implements AiProvider {
  readonly id: string;
  private readonly inner: AiProvider;
  private readonly maxAttempts: number;

  constructor(inner: AiProvider, options?: GuardedAiProviderOptions) {
    this.inner = inner;
    this.id = inner.id;
    this.maxAttempts = Math.max(1, options?.maxAttempts ?? 2);
  }

  async generateStructured<T>(
    input: GenerateStructuredInput,
    schema: z.ZodType<T>,
    options?: GenerateStructuredOptions,
  ): Promise<AiResult<T>> {
    const purpose = purposeForLog(input.purpose);
    const baseSystem = [SAFETY_SYSTEM_INSTRUCTION, input.systemInstruction?.trim()]
      .filter(Boolean)
      .join("\n\n");

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const systemInstruction =
        attempt === 1
          ? baseSystem
          : `${baseSystem}\n\n${GUARDRAIL_REGEN_HINT}`;

      const result = await this.inner.generateStructured(
        { ...input, systemInstruction },
        schema,
        options,
      );

      if (!result.ok) return result;

      const check = checkAiOutput(result.meta.rawText, result.data);
      if (check.ok) return result;

      logger.info("ai.guardrail.blocked", {
        event: "ai_guardrail_blocked",
        purpose,
        providerId: this.id,
        code: "guardrail_blocked",
        reason: check.reason,
        attempt,
      });
    }

    return {
      ok: false,
      code: "guardrail_blocked",
      error: AI_SAFE_ERRORS.guardrail_blocked,
    };
  }
}
