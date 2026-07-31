import { describe, it, expect } from "vitest";
import {
  aiParsesRemaining,
  freeAiParseLimit,
  isAiParseQuotaExceeded,
  PAST_DUE_GRACE_MS,
  resolveEffectivePlan,
  type SubscriptionSnapshot,
} from "@/lib/domain/billing/entitlements";

const now = new Date("2026-07-31T12:00:00.000Z");

function proSub(
  overrides: Partial<SubscriptionSnapshot> = {},
): SubscriptionSnapshot {
  return {
    plan: "pro",
    status: "active",
    trialEndsAt: null,
    currentPeriodEnd: null,
    ...overrides,
  };
}

describe("freeAiParseLimit", () => {
  it("floors and clamps invalid values", () => {
    expect(freeAiParseLimit(5.9)).toBe(5);
    expect(freeAiParseLimit(-1)).toBe(0);
    expect(freeAiParseLimit(Number.NaN)).toBe(5);
  });
});

describe("resolveEffectivePlan", () => {
  it("returns free when no subscription", () => {
    expect(resolveEffectivePlan(null, now)).toBe("free");
  });

  it("returns free for free plan or expired pro", () => {
    expect(
      resolveEffectivePlan(
        { plan: "free", status: "expired", trialEndsAt: null, currentPeriodEnd: null },
        now,
      ),
    ).toBe("free");
    expect(resolveEffectivePlan(proSub({ status: "expired" }), now)).toBe(
      "free",
    );
  });

  it("returns pro for active pro", () => {
    expect(resolveEffectivePlan(proSub({ status: "active" }), now)).toBe("pro");
  });

  it("returns pro while trialing before trialEndsAt", () => {
    expect(
      resolveEffectivePlan(
        proSub({
          status: "trialing",
          trialEndsAt: new Date("2026-08-01T00:00:00.000Z"),
        }),
        now,
      ),
    ).toBe("pro");
  });

  it("returns free when trial ended", () => {
    expect(
      resolveEffectivePlan(
        proSub({
          status: "trialing",
          trialEndsAt: new Date("2026-07-30T00:00:00.000Z"),
        }),
        now,
      ),
    ).toBe("free");
  });

  it("returns pro for canceled until period end", () => {
    expect(
      resolveEffectivePlan(
        proSub({
          status: "canceled",
          currentPeriodEnd: new Date("2026-08-15T00:00:00.000Z"),
        }),
        now,
      ),
    ).toBe("pro");
  });

  it("returns free for canceled after period end", () => {
    expect(
      resolveEffectivePlan(
        proSub({
          status: "canceled",
          currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
        }),
        now,
      ),
    ).toBe("free");
  });

  it("returns pro for past_due within grace window", () => {
    const periodEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(
      resolveEffectivePlan(
        proSub({ status: "past_due", currentPeriodEnd: periodEnd }),
        now,
      ),
    ).toBe("pro");
  });

  it("returns free for past_due after grace window", () => {
    const periodEnd = new Date(now.getTime() - PAST_DUE_GRACE_MS - 1000);
    expect(
      resolveEffectivePlan(
        proSub({ status: "past_due", currentPeriodEnd: periodEnd }),
        now,
      ),
    ).toBe("free");
  });
});

describe("aiParsesRemaining / isAiParseQuotaExceeded", () => {
  it("Pro is unlimited", () => {
    expect(aiParsesRemaining("pro", 100, 5)).toBeNull();
    expect(isAiParseQuotaExceeded("pro", 100, 5)).toBe(false);
  });

  it("free users decrement remaining", () => {
    expect(aiParsesRemaining("free", 3, 5)).toBe(2);
    expect(isAiParseQuotaExceeded("free", 4, 5)).toBe(false);
    expect(isAiParseQuotaExceeded("free", 5, 5)).toBe(true);
  });
});
