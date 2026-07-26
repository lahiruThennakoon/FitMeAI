import type { z } from "zod";
import { parseAndValidate } from "@/lib/ai/parse";
import {
  AI_SAFE_ERRORS,
  type AiProvider,
  type AiResult,
  type GenerateStructuredInput,
  type GenerateStructuredOptions,
} from "@/lib/ai/types";

export type FakeAiHandler = (
  input: GenerateStructuredInput,
) => Promise<string> | string;

/**
 * Deterministic adapter for tests and local runs without GEMINI_API_KEY.
 * Handler returns raw model text (JSON string); Zod still validates.
 */
export class FakeAiProvider implements AiProvider {
  readonly id = "fake";
  private readonly model: string;
  private readonly handler: FakeAiHandler;

  constructor(
    handler: FakeAiHandler = () => {
      throw new Error("FakeAiProvider handler not configured");
    },
    model = "fake-model",
  ) {
    this.handler = handler;
    this.model = model;
  }

  async generateStructured<T>(
    input: GenerateStructuredInput,
    schema: z.ZodType<T>,
    options?: GenerateStructuredOptions,
  ): Promise<AiResult<T>> {
    void options;
    try {
      const rawText = await this.handler(input);
      return parseAndValidate(rawText, schema, {
        providerId: this.id,
        model: this.model,
      });
    } catch {
      return {
        ok: false,
        code: "provider_error",
        error: AI_SAFE_ERRORS.provider_error,
      };
    }
  }
}
