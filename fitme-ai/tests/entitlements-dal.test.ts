import { describe, it, expect, vi, beforeEach } from "vitest";

const findSubscription = vi.fn();
const findProfile = vi.fn();
const countInteractions = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: {
      findUnique: (...args: unknown[]) => findSubscription(...args),
    },
    userProfile: {
      findUnique: (...args: unknown[]) => findProfile(...args),
    },
    aIInteraction: {
      count: (...args: unknown[]) => countInteractions(...args),
    },
  },
}));

import {
  assertAiParseAllowed,
  countAiParsesToday,
  EntitlementError,
  getEntitlements,
} from "@/lib/dal/entitlements";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("BILLING_ENABLED", "true");
  vi.stubEnv("FREE_AI_PARSES_PER_DAY", "5");
  findProfile.mockResolvedValue({ timezone: "Asia/Colombo" });
  findSubscription.mockResolvedValue(null);
  countInteractions.mockResolvedValue(0);
});

describe("getEntitlements", () => {
  it("treats missing subscription as free with remaining quota", async () => {
    countInteractions.mockResolvedValue(2);
    const ent = await getEntitlements("u1");
    expect(ent.plan).toBe("free");
    expect(ent.aiParsesRemaining).toBe(3);
    expect(ent.freeAiParsesPerDay).toBe(5);
  });

  it("returns unlimited when BILLING_ENABLED=false", async () => {
    vi.stubEnv("BILLING_ENABLED", "false");
    countInteractions.mockResolvedValue(99);
    const ent = await getEntitlements("u1");
    expect(ent.plan).toBe("pro");
    expect(ent.aiParsesRemaining).toBeNull();
    expect(findSubscription).not.toHaveBeenCalled();
  });

  it("skips quota for active pro subscription", async () => {
    findSubscription.mockResolvedValue({
      plan: "pro",
      status: "active",
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    const ent = await getEntitlements("u1");
    expect(ent.plan).toBe("pro");
    expect(ent.aiParsesRemaining).toBeNull();
    expect(countInteractions).not.toHaveBeenCalled();
  });
});

describe("countAiParsesToday", () => {
  it("scopes count to profile timezone day and succeeded food_parse only", async () => {
    countInteractions.mockResolvedValue(4);
    const n = await countAiParsesToday("u1");
    expect(n).toBe(4);
    expect(findProfile).toHaveBeenCalledWith({
      where: { userId: "u1" },
      select: { timezone: true },
    });
    expect(countInteractions).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u1",
          purpose: "food_parse",
          status: "succeeded",
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
          requestMeta: {
            path: ["promptCharLength"],
            gt: 0,
          },
        }),
      }),
    );
  });
});

describe("assertAiParseAllowed", () => {
  it("allows parse when under daily limit", async () => {
    countInteractions.mockResolvedValue(4);
    await expect(assertAiParseAllowed("u1")).resolves.toBeUndefined();
  });

  it("throws when free quota exhausted", async () => {
    countInteractions.mockResolvedValue(5);
    await expect(assertAiParseAllowed("u1")).rejects.toMatchObject({
      code: "ai_quota_exceeded",
    });
    await expect(assertAiParseAllowed("u1")).rejects.toBeInstanceOf(
      EntitlementError,
    );
  });

  it("allows pro users regardless of count", async () => {
    findSubscription.mockResolvedValue({
      plan: "pro",
      status: "active",
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    countInteractions.mockResolvedValue(100);
    await expect(assertAiParseAllowed("u1")).resolves.toBeUndefined();
    expect(countInteractions).not.toHaveBeenCalled();
  });

  it("skips quota when BILLING_ENABLED=false", async () => {
    vi.stubEnv("BILLING_ENABLED", "false");
    countInteractions.mockResolvedValue(99);
    await expect(assertAiParseAllowed("u1")).resolves.toBeUndefined();
    expect(findSubscription).not.toHaveBeenCalled();
    expect(countInteractions).not.toHaveBeenCalled();
  });
});
