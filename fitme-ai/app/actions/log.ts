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
import { diffAiCorrections } from "@/lib/domain/nutrition/corrections";
import { readAiRuntimeConfig } from "@/lib/ai/config";
import { resolveParsedMeal } from "@/lib/domain/nutrition/resolve-parse";
import type { ParsedMealDraft } from "@/lib/domain/nutrition/parse-types";
import {
  saveConfirmedFoodEntries,
  type SavedFoodEntryDto,
} from "@/lib/dal/food-entry";
import { fieldErrorsFromZod } from "@/lib/auth/actions-shared";
import { logger } from "@/lib/logging";
import {
  clientKeyFromHeaders,
  enforceAiRateLimit,
  RATE_LIMIT_ERROR,
} from "@/lib/rate-limit";
import { err, ok, type Result } from "@/lib/result";
import {
  parseMealInputSchema,
  saveMealDraftSchema,
} from "@/lib/schemas/log";

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

export type SaveMealDraftResult = Result<{
  entries: SavedFoodEntryDto[];
  correctionCount: number;
}>;

export type SaveMealDraftActionDeps = {
  requireSession?: typeof requireSession;
  saveConfirmedFoodEntries?: typeof saveConfirmedFoodEntries;
};

/**
 * Persist reviewed drafts only after explicit confirm (FR-9).
 * Records UserCorrection diffs for AI-origin edits (FR-20).
 */
export async function saveMealDraftAction(
  input: unknown,
  deps: SaveMealDraftActionDeps = {},
): Promise<SaveMealDraftResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const saveEntries = deps.saveConfirmedFoodEntries ?? saveConfirmedFoodEntries;

  let userId: string;
  try {
    const user = await requireSessionFn();
    userId = user.id;
  } catch {
    return err("Please sign in to save food.");
  }

  const parsed = saveMealDraftSchema.safeParse(input);
  if (!parsed.success) {
    // Missing confirmed:true → never persist AI drafts silently.
    if (
      typeof input === "object" &&
      input !== null &&
      "confirmed" in input &&
      (input as { confirmed?: unknown }).confirmed !== true
    ) {
      return err("Confirm your review before saving.");
    }
    return err("Check the highlighted fields.", fieldErrorsFromZod(parsed.error));
  }

  // Name identity edit must not keep a mismatched catalog FK (defense in depth).
  const items = parsed.data.items.map((item) => {
    if (
      item.origin === "ai_parse" &&
      item.aiSnapshot &&
      item.name.trim() !== item.aiSnapshot.name.trim()
    ) {
      return {
        ...item,
        foodSlug: null,
        catalog: null,
        breakdown: null,
        kind: "estimated" as const,
        dataSource: "ai_estimated" as const,
      };
    }
    return item;
  });

  const diffsByDraftId = new Map(
    items.map((item) => [item.id, diffAiCorrections(item)]),
  );
  const correctionCount = [...diffsByDraftId.values()].reduce(
    (n, d) => n + d.length,
    0,
  );

  const aiCfg = readAiRuntimeConfig();

  try {
    const entries = await saveEntries(
      {
        userId,
        items: items as ParsedMealDraft["items"],
        providerId: aiCfg.provider,
        model: aiCfg.model,
      },
      diffsByDraftId,
    );
    logger.info("log.save.ok", {
      event: "food_save_ok",
      entryCount: entries.length,
      correctionCount,
    });
    return ok({ entries, correctionCount });
  } catch {
    logger.error("log.save.failed", { event: "food_save_failed" });
    return err("Could not save your log. Please try again.");
  }
}

