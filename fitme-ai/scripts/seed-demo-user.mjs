/**
 * Create or reset a local demo login (dev only).
 * Usage: node scripts/seed-demo-user.mjs
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

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

loadEnvFile();

import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_NAME,
  DEMO_LOGIN_URL,
} from "./demo/constants.mjs";

const prisma = new PrismaClient();

async function hashPassword(password) {
  const { hashPassword } = await import("better-auth/crypto");
  return hashPassword(password);
}

function newId() {
  return randomBytes(16).toString("base64url");
}

try {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: { accounts: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { emailVerified: true, name: DEMO_NAME },
    });
    const cred = existing.accounts.find((a) => a.providerId === "credential");
    if (cred) {
      await prisma.account.update({
        where: { id: cred.id },
        data: { password: passwordHash },
      });
    } else {
      await prisma.account.create({
        data: {
          id: newId(),
          userId: existing.id,
          accountId: existing.id,
          providerId: "credential",
          password: passwordHash,
        },
      });
    }
    console.log("Updated existing demo user.");
  } else {
    const userId = newId();
    await prisma.user.create({
      data: {
        id: userId,
        email: DEMO_EMAIL,
        name: DEMO_NAME,
        emailVerified: true,
        accounts: {
          create: {
            id: newId(),
            accountId: userId,
            providerId: "credential",
            password: passwordHash,
          },
        },
      },
    });
    console.log("Created demo user.");
  }

  console.log("\n--- Demo login (local dev only) ---");
  console.log("URL:      ", DEMO_LOGIN_URL);
  console.log("Email:    ", DEMO_EMAIL);
  console.log("Password: ", DEMO_PASSWORD);
  console.log("-----------------------------------\n");
} catch (e) {
  console.error("FAILED:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
