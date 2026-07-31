import "server-only";

import { normalizeEmail } from "@/lib/domain/auth/email";
import { prisma } from "@/lib/db";

/** Lookup user id by normalized email; returns null when no row exists. */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true },
  });
  return user?.id ?? null;
}

/**
 * Ensure a free-tier subscription row exists for the user.
 * Idempotent — never downgrades an existing Pro row.
 * @returns true when a new row was created.
 */
export async function ensureFreeSubscription(userId: string): Promise<boolean> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (existing) return false;

  await prisma.subscription.create({
    data: {
      userId,
      plan: "free",
      status: "expired",
    },
  });
  return true;
}

/** Grant manual Pro access (beta / ops). Upserts active Pro — never downgrades billing ids. */
export async function grantProSubscription(userId: string): Promise<void> {
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: "pro",
      status: "active",
    },
    update: {
      plan: "pro",
      status: "active",
      cancelAtPeriodEnd: false,
    },
  });
}

/** Resolve user by email and grant Pro; returns null when user not found. */
export async function grantProSubscriptionByEmail(
  email: string,
): Promise<{ userId: string } | null> {
  const userId = await findUserIdByEmail(email);
  if (!userId) return null;
  await grantProSubscription(userId);
  return { userId };
}

/** Called after signup — creates free subscription row when user exists. */
export async function provisionFreeSubscriptionForEmail(
  email: string,
): Promise<void> {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;
  await ensureFreeSubscription(userId);
}
