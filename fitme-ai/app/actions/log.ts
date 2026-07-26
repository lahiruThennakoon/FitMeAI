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
import { CLARIFYING_CONFIDENCE_THRESHOLD } from "@/lib/domain/nutrition/clarifying-chips";
import {
  buildCatalogDraft,
  buildEstimatedDraft,
} from "@/lib/domain/nutrition/estimate-fallback";
import {
  lookupFoodByName,
  resolveParsedMeal,
} from "@/lib/domain/nutrition/resolve-parse";
import type {
  ParsedFoodItemDraft,
  ParsedMealDraft,
} from "@/lib/domain/nutrition/parse-types";
import {
  averageConfidence,
  buildAiRequestMeta,
  buildFoodParseResponseSummary,
} from "@/lib/ai/audit";
import {
  recordAiInteraction,
  type RecordAiInteractionInput,
} from "@/lib/dal/ai-interaction";
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
  rematchFoodDraftSchema,
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
  recordAiInteraction?: (
    input: RecordAiInteractionInput,
  ) => Promise<{ id: string }>;
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
  const recordInteraction = deps.recordAiInteraction ?? recordAiInteraction;

  let userId: string;
  try {
    const user = await requireSessionFn();
    userId = user.id;
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
  const aiCfg = readAiRuntimeConfig();
  const requestMeta = buildAiRequestMeta("food_parse", text.length);

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
    try {
      await recordInteraction({
        userId,
        providerId: provider.id,
        model: aiCfg.model,
        purpose: "food_parse",
        status: "failed",
        errorCode: aiResult.code,
        confidence: null,
        requestMeta,
        responseSummary: null,
      });
    } catch {
      // Audit write must not block the user-facing fail-safe.
    }
    const failMeta = {
      event: "food_parse_failed",
      purpose: "food_parse",
      code: aiResult.code,
      providerId: provider.id,
    };
    logger.info("log.parse.failed", failMeta);
    return err(MANUAL_FALLBACK);
  }

  try {
    const draft = await resolveParsedMeal(aiResult.data, text.length, {
      findFoodBySlugOrAlias: findFood,
    });
    const summary = buildFoodParseResponseSummary(aiResult.data);
    const confidence = averageConfidence(
      aiResult.data.items.map((i) => i.confidence),
    );
    let aiInteractionId: string | null = null;
    try {
      const interaction = await recordInteraction({
        userId,
        providerId: provider.id,
        model: aiResult.meta.model || aiCfg.model,
        purpose: "food_parse",
        status: "succeeded",
        errorCode: null,
        confidence,
        requestMeta,
        responseSummary: summary,
      });
      aiInteractionId = interaction.id;
    } catch {
      // Save can still create a stub interaction later.
    }
    const okMeta = {
      event: "food_parse_ok",
      purpose: "food_parse",
      providerId: provider.id,
      itemCount: draft.items.length,
    };
    logger.info("log.parse.ok", okMeta);
    return ok({ ...draft, aiInteractionId });
  } catch {
    try {
      await recordInteraction({
        userId,
        providerId: provider.id,
        model: aiCfg.model,
        purpose: "food_parse",
        status: "failed",
        errorCode: "provider_error",
        confidence: null,
        requestMeta,
        responseSummary: null,
      });
    } catch {
      // ignore
    }
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
        aiInteractionId: parsed.data.aiInteractionId ?? null,
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

export type RematchFoodDraftResult = Result<ParsedFoodItemDraft>;

export type RematchFoodDraftActionDeps = {
  requireSession?: typeof requireSession;
  findFoodBySlugOrAlias?: typeof findFoodBySlugOrAlias;
};

/**
 * Prefer catalog match when the user edits a food name (FR-11).
 * No match → keep estimate provenance with current nutrition.
 */
export async function rematchFoodDraftAction(
  input: unknown,
  deps: RematchFoodDraftActionDeps = {},
): Promise<RematchFoodDraftResult> {
  const requireSessionFn = deps.requireSession ?? requireSession;
  const findFood = deps.findFoodBySlugOrAlias ?? findFoodBySlugOrAlias;

  try {
    await requireSessionFn();
  } catch {
    return err("Please sign in to update food.");
  }

  const parsed = rematchFoodDraftSchema.safeParse(input);
  if (!parsed.success) {
    return err("Check the highlighted fields.", fieldErrorsFromZod(parsed.error));
  }

  const data = parsed.data;
  const identity = {
    id: data.id,
    quantity: data.quantity,
    unit: data.unit,
    mealType: data.mealType,
    loggedAt: data.loggedAt,
    confidence: data.confidence,
    origin: data.origin,
    aiSnapshot: data.aiSnapshot,
  };

  try {
    const food = await lookupFoodByName(data.name, findFood);
    if (food) {
      return ok(buildCatalogDraft(food, identity));
    }
    return ok(
      buildEstimatedDraft(data.name, identity, data.nutrition, {
        needsClarification:
          data.confidence < CLARIFYING_CONFIDENCE_THRESHOLD,
      }),
    );
  } catch {
    return err("Could not look up that food. Please try again.");
  }
}

