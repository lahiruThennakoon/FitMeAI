"use server";

import { headers } from "next/headers";
import { requireSession } from "@/lib/dal";
import { findFoodBySlugOrAlias } from "@/lib/dal/nutrition";
import { createAiProvider, type AiProvider } from "@/lib/ai";
import {
  FOOD_PARSE_SYSTEM,
  foodParseAiSchema,
  foodParseResponseSchema,
} from "@/lib/ai/schemas/food-parse";
import { resolveParsedMeal } from "@/lib/domain/nutrition/resolve-parse";
import type { ParsedMealDraft } from "@/lib/domain/nutrition/parse-types";
import { fieldErrorsFromZod } from "@/lib/auth/actions-shared";
import { logger } from "@/lib/logging";
import {
  clientKeyFromHeaders,
  enforceAiRateLimit,
  RATE_LIMIT_ERROR,
} from "@/lib/rate-limit";
import { err, ok, type Result } from "@/lib/result";
import { parseMealInputSchema } from "@/lib/schemas/log";

export type ParseMealResult = Result<ParsedMealDraft>;

export type ParseMealActionDeps = {
  requireSession?: typeof requireSession;
  createAiProvider?: () => AiProvider;
  findFoodBySlugOrAlias?: typeof findFoodBySlugOrAlias;
  getClientKey?: () => Promise<string>;
  rateLimit?: (
    bucket: "foodParse",
    clientKey: string,
  ) => ReturnType<typeof enforceAiRateLimit>;
};

const MANUAL_FALLBACK =
  "We couldn't parse that meal. Enter foods manually below, or try again with a shorter description.";

/**
 * Parse natural-language meal text into structured draft items (FR-6).
 * Does not persist — review/save is Story 2.6.
 */
export async function parseMealAction(
  input: unknown,
  deps: ParseMealActionDeps = {},
): Promise<ParseMealResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const createProvider = deps.createAiProvider ?? (() => createAiProvider());
  const findFood = deps.findFoodBySlugOrAlias ?? findFoodBySlugOrAlias;
  const getClientKey =
    deps.getClientKey ??
    (async () => clientKeyFromHeaders(await headers()));
  const rateLimit =
    deps.rateLimit ??
    ((bucket, clientKey) => enforceAiRateLimit({ bucket, clientKey }));

  try {
    await requireSessionFn();
  } catch {
    return err("Please sign in to log food.");
  }

  let clientKey: string;
  try {
    clientKey = await getClientKey();
  } catch {
    return err(RATE_LIMIT_ERROR);
  }

  const limited = rateLimit("foodParse", clientKey);
  if (!limited.ok) {
    return err(RATE_LIMIT_ERROR);
  }

  const parsed = parseMealInputSchema.safeParse(input);
  if (!parsed.success) {
    return err("Check the highlighted fields.", fieldErrorsFromZod(parsed.error));
  }

  const { text } = parsed.data;
  const provider = createProvider();

  const aiResult = await provider.generateStructured(
    {
      purpose: "food_parse",
      systemInstruction: FOOD_PARSE_SYSTEM,
      userPrompt: text,
      responseSchema: { ...foodParseResponseSchema },
    },
    foodParseAiSchema,
  );

  if (!aiResult.ok) {
    logger.info("log.parse.failed", {
      event: "food_parse_failed",
      purpose: "food_parse",
      code: aiResult.code,
      providerId: provider.id,
    });
    return err(MANUAL_FALLBACK);
  }

  try {
    const draft = await resolveParsedMeal(aiResult.data, text.length, {
      findFoodBySlugOrAlias: findFood,
    });
    logger.info("log.parse.ok", {
      event: "food_parse_ok",
      purpose: "food_parse",
      providerId: provider.id,
      itemCount: draft.items.length,
    });
    return ok(draft);
  } catch {
    logger.error("log.parse.resolve_failed", {
      event: "food_parse_resolve_failed",
      purpose: "food_parse",
    });
    return err(MANUAL_FALLBACK);
  }
}
