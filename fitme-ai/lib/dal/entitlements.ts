import "server-only";

import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import { readBillingRuntimeConfig } from "@/lib/billing/config";
import { zonedDayBounds } from "@/lib/domain/dashboard/day-bounds";
import {
  AI_PARSE_QUOTA_MESSAGE,
  aiParsesRemaining,
  isAiParseQuotaExceeded,
  resolveEffectivePlan,
  type EffectivePlan,
} from "@/lib/domain/billing/entitlements";
import { prisma } from "@/lib/db";

export type EntitlementErrorCode = "upgrade_required" | "ai_quota_exceeded";

export class EntitlementError extends Error {
  constructor(
    message: string,
    public readonly code: EntitlementErrorCode,
  ) {
    super(message);
    this.name = "EntitlementError";
  }
}

export type SubscriptionDto = {
  plan: PlanTier;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

export type EntitlementsDto = {
  plan: EffectivePlan;
  /** Null when Pro (unlimited). */
  aiParsesRemaining: number | null;
  freeAiParsesPerDay: number;
};

export async function getSubscription(
  userId: string,
): Promise<SubscriptionDto | null> {
  const row = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      plan: true,
      status: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });
  return row;
}

async function getProfileTimezone(userId: string): Promise<string> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { timezone: true },
  });
  const tz = profile?.timezone?.trim();
  return tz && tz.length > 0 ? tz : "UTC";
}

export async function countAiParsesToday(userId: string): Promise<number> {
  const timeZone = await getProfileTimezone(userId);
  const { start, end } = zonedDayBounds(new Date(), timeZone);

  return prisma.aIInteraction.count({
    where: {
      userId,
      purpose: "food_parse",
      status: "succeeded",
      createdAt: { gte: start, lt: end },
      // Exclude audit stubs (manual save / relog) — only meter real LLM parses.
      requestMeta: {
        path: ["promptCharLength"],
        gt: 0,
      },
    },
  });
}

export async function getEntitlements(userId: string): Promise<EntitlementsDto> {
  const billing = readBillingRuntimeConfig();

  if (!billing.billingEnabled) {
    return {
      plan: "pro",
      aiParsesRemaining: null,
      freeAiParsesPerDay: billing.freeAiParsesPerDay,
    };
  }

  const sub = await getSubscription(userId);
  const plan = resolveEffectivePlan(sub);
  const usedToday = plan === "pro" ? 0 : await countAiParsesToday(userId);

  return {
    plan,
    aiParsesRemaining: aiParsesRemaining(
      plan,
      usedToday,
      billing.freeAiParsesPerDay,
    ),
    freeAiParsesPerDay: billing.freeAiParsesPerDay,
  };
}

/** Throws when a free user has exhausted today's AI parse quota. */
export async function assertAiParseAllowed(userId: string): Promise<void> {
  const billing = readBillingRuntimeConfig();

  if (!billing.billingEnabled) return;

  const sub = await getSubscription(userId);
  const plan = resolveEffectivePlan(sub);
  if (plan === "pro") return;

  const usedToday = await countAiParsesToday(userId);
  if (
    isAiParseQuotaExceeded(plan, usedToday, billing.freeAiParsesPerDay)
  ) {
    throw new EntitlementError(
      AI_PARSE_QUOTA_MESSAGE,
      "ai_quota_exceeded",
    );
  }
}
