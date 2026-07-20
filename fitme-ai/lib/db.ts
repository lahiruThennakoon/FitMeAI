import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton (AD-1 support). A single client instance prevents connection
 * pool exhaustion across hot reloads and serverless invocations.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
