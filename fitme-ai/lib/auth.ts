import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";
import { deliverVerificationEmail } from "@/lib/email/verification-email";
import { deliverPasswordResetEmail } from "@/lib/email/password-reset-email";
import { deliverChangeEmailVerification } from "@/lib/email/change-email-email";
import { purgeUserOrphanData } from "@/lib/dal/user";
import { logger } from "@/lib/logging";

/**
 * Better Auth server instance (AD-6).
 * - Email/password enabled; passwords stored hashed by Better Auth.
 * - Sessions are DB-backed so revocation (deleting the session row) is immediate.
 * - Email verification required before sign-in (Story 1.2 / FR-1).
 * - nextCookies() last so Server Actions can write session cookies.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  // Suppress Better Auth info logs that include raw emails (AD-9).
  logger: { level: "warn" },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await deliverPasswordResetEmail({
        to: user.email,
        url,
        userId: user.id,
      });
    },
  },
  emailVerification: {
    // Delivery is invoked from registerAction so failures propagate (Decision A).
    sendOnSignUp: false,
    sendVerificationEmail: async ({ user, url }) => {
      await deliverVerificationEmail({
        to: user.email,
        url,
        userId: user.id,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  user: {
    changeEmail: {
      enabled: true,
      // Sent to the old address so losing a session can't lose the account.
      // Params typed explicitly: this callback's argument is not inferred here.
      sendChangeEmailVerification: async ({
        user,
        newEmail,
        url,
      }: {
        user: { id: string; email: string };
        newEmail: string;
        url: string;
      }) => {
        await deliverChangeEmailVerification({
          to: user.email,
          newEmail,
          url,
          userId: user.id,
        });
      },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        await purgeUserOrphanData(user.id, user.email);
      },
      afterDelete: async (user) => {
        logger.info("auth.account.deleted", {
          outcome: "completed",
          userId: user.id,
        });
      },
    },
  },
  plugins: [nextCookies()],
});

export type Auth = typeof auth;
