/**
 * Freemium plan limits and effective-plan resolution (Story 11.1).
 * Pure domain — no I/O.
 */

export type PlanTier = "free" | "pro";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";

export type EffectivePlan = "free" | "pro";

export type SubscriptionSnapshot = {
  plan: PlanTier;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
};

/** Grace after period end while past_due (3 calendar days). */
export const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export const PLAN_LIMITS = {
  free: {
    aiParsesPerDay: "limited" as const,
  },
  pro: {
    aiParsesPerDay: "unlimited" as const,
  },
} as const;

export const AI_PARSE_QUOTA_MESSAGE =
  "You've used today's free smart parses. Quick log and manual entry still work — or upgrade to Pro for unlimited parsing.";

/** Normalize env/config into a non-negative daily free parse cap. */
export function freeAiParseLimit(envLimit: number): number {
  if (!Number.isFinite(envLimit)) return 5;
  return Math.max(0, Math.floor(envLimit));
}

/**
 * Map persisted subscription state to the plan used for gating.
 * Absence of a row is handled by the caller (treat as free).
 */
export function resolveEffectivePlan(
  sub: SubscriptionSnapshot | null,
  now: Date = new Date(),
): EffectivePlan {
  if (!sub || sub.plan !== "pro") return "free";

  switch (sub.status) {
    case "active":
      return "pro";
    case "trialing":
      return sub.trialEndsAt && sub.trialEndsAt > now ? "pro" : "free";
    case "canceled":
      return sub.currentPeriodEnd && sub.currentPeriodEnd > now ? "pro" : "free";
    case "past_due": {
      if (!sub.currentPeriodEnd) return "free";
      const graceEnd = new Date(sub.currentPeriodEnd.getTime() + PAST_DUE_GRACE_MS);
      return graceEnd > now ? "pro" : "free";
    }
    case "expired":
    default:
      return "free";
  }
}

/** Remaining parses for free users; `null` means unlimited (Pro). */
export function aiParsesRemaining(
  plan: EffectivePlan,
  usedToday: number,
  dailyLimit: number,
): number | null {
  if (plan === "pro") return null;
  return Math.max(0, dailyLimit - usedToday);
}

export function isAiParseQuotaExceeded(
  plan: EffectivePlan,
  usedToday: number,
  dailyLimit: number,
): boolean {
  if (plan === "pro") return false;
  return usedToday >= dailyLimit;
}
