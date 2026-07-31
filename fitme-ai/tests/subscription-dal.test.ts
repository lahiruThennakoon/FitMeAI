import { describe, it, expect, vi, beforeEach } from "vitest";

const findUser = vi.fn();
const findSubscription = vi.fn();
const createSubscription = vi.fn();
const upsertSubscription = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUser(...args),
    },
    subscription: {
      findUnique: (...args: unknown[]) => findSubscription(...args),
      create: (...args: unknown[]) => createSubscription(...args),
      upsert: (...args: unknown[]) => upsertSubscription(...args),
    },
  },
}));

import {
  ensureFreeSubscription,
  findUserIdByEmail,
  grantProSubscription,
  grantProSubscriptionByEmail,
  provisionFreeSubscriptionForEmail,
} from "@/lib/dal/subscription";

beforeEach(() => {
  vi.clearAllMocks();
  findUser.mockResolvedValue(null);
  findSubscription.mockResolvedValue(null);
  createSubscription.mockResolvedValue({ id: "sub1" });
  upsertSubscription.mockResolvedValue({ id: "sub1" });
});

describe("findUserIdByEmail", () => {
  it("normalizes email for lookup", async () => {
    findUser.mockResolvedValue({ id: "u1" });
    const id = await findUserIdByEmail("  User@Example.COM ");
    expect(id).toBe("u1");
    expect(findUser).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      select: { id: true },
    });
  });
});

describe("ensureFreeSubscription", () => {
  it("creates a free row when missing", async () => {
    const created = await ensureFreeSubscription("u1");
    expect(created).toBe(true);
    expect(createSubscription).toHaveBeenCalledWith({
      data: { userId: "u1", plan: "free", status: "expired" },
    });
  });

  it("is idempotent when row already exists", async () => {
    findSubscription.mockResolvedValue({ id: "sub1" });
    const created = await ensureFreeSubscription("u1");
    expect(created).toBe(false);
    expect(createSubscription).not.toHaveBeenCalled();
  });
});

describe("grantProSubscription", () => {
  it("upserts active pro", async () => {
    await grantProSubscription("u1");
    expect(upsertSubscription).toHaveBeenCalledWith({
      where: { userId: "u1" },
      create: { userId: "u1", plan: "pro", status: "active" },
      update: {
        plan: "pro",
        status: "active",
        cancelAtPeriodEnd: false,
      },
    });
  });
});

describe("grantProSubscriptionByEmail", () => {
  it("returns null when user missing", async () => {
    const result = await grantProSubscriptionByEmail("missing@example.com");
    expect(result).toBeNull();
    expect(upsertSubscription).not.toHaveBeenCalled();
  });

  it("grants pro when user exists", async () => {
    findUser.mockResolvedValue({ id: "u1" });
    const result = await grantProSubscriptionByEmail("user@example.com");
    expect(result).toEqual({ userId: "u1" });
    expect(upsertSubscription).toHaveBeenCalledOnce();
  });
});

describe("provisionFreeSubscriptionForEmail", () => {
  it("no-ops when user not found", async () => {
    await provisionFreeSubscriptionForEmail("ghost@example.com");
    expect(createSubscription).not.toHaveBeenCalled();
  });

  it("creates free subscription for resolved user", async () => {
    findUser.mockResolvedValue({ id: "u1" });
    await provisionFreeSubscriptionForEmail("user@example.com");
    expect(createSubscription).toHaveBeenCalledOnce();
  });
});
