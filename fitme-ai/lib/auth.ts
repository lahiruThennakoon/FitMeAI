import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";

/**
 * Better Auth server instance (AD-6).
 * - Email/password enabled; passwords stored hashed by Better Auth.
 * - Sessions are DB-backed so revocation (deleting the session row) is immediate.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    // Verification wiring lands in Story 1.2; kept off here so the shell builds.
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  session: {
    // Read the session from the DB per request (no long-lived JWT trust).
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
});

export type Auth = typeof auth;
