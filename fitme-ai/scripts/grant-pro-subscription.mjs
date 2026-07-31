/**
 * Grant manual Pro subscription for beta / ops (Story 11.2).
 * Usage: node scripts/grant-pro-subscription.mjs <email>
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

function loadEnvFile() {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function normalizeEmail(raw) {
  return raw.trim().toLowerCase();
}

loadEnvFile();

const emailArg = process.argv[2];
if (!emailArg) {
  console.error("Usage: node scripts/grant-pro-subscription.mjs <email>");
  process.exit(1);
}

const email = normalizeEmail(emailArg);
const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    console.error(`No user found for email: ${email}`);
    process.exitCode = 1;
  } else {
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan: "pro",
        status: "active",
      },
      update: {
        plan: "pro",
        status: "active",
        cancelAtPeriodEnd: false,
      },
    });
    console.log(`Granted Pro subscription to ${user.email} (${user.id})`);
  }
} catch (e) {
  console.error("DB_ERROR:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
