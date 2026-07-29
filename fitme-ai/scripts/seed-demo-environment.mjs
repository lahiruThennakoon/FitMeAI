/**
 * Start local demo: Postgres (Docker), migrations, demo user + rich sample data.
 * Usage: node scripts/seed-demo-environment.mjs [--skip-docker] [--skip-migrate]
 */
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_NAME,
  DEMO_LOGIN_URL,
} from "./demo/constants.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const args = new Set(process.argv.slice(2));

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

function run(cmd, opts = {}) {
  execSync(cmd, { cwd: root, stdio: "inherit", shell: true, ...opts });
}

function newId() {
  return randomBytes(16).toString("base64url");
}

function daysAgoAt(daysBack, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function hashPassword(password) {
  const { hashPassword } = await import("better-auth/crypto");
  return hashPassword(password);
}

async function ensureDemoUser(prisma) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  let user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: { accounts: true },
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, name: DEMO_NAME },
    });
    const cred = user.accounts.find((a) => a.providerId === "credential");
    if (cred) {
      await prisma.account.update({
        where: { id: cred.id },
        data: { password: passwordHash },
      });
    } else {
      await prisma.account.create({
        data: {
          id: newId(),
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: passwordHash,
        },
      });
    }
  } else {
    const userId = newId();
    user = await prisma.user.create({
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
      include: { accounts: true },
    });
  }

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName: DEMO_NAME,
      ageYears: 32,
      sex: "male",
      heightCm: 175,
      currentWeightG: 72_000,
      targetWeightG: 70_000,
      activityLevel: "moderately_active",
      dietaryPreferences: [],
      goalType: "weight_loss",
      preferredUnits: "metric",
      country: "LK",
      timezone: "Asia/Colombo",
    },
    update: {
      displayName: DEMO_NAME,
      currentWeightG: 72_000,
      targetWeightG: 70_000,
      timezone: "Asia/Colombo",
    },
  });

  await prisma.goal.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      bmrKcal: 1649,
      tdeeKcal: 2556,
      caloriesKcal: 2100,
      proteinG: 130,
      carbsG: 220,
      fatG: 65,
      fibreG: 30,
      waterMl: 2450,
      steps: 8000,
      exerciseMinutes: 30,
      weeklyWeightChangeG: -500,
      overriddenFields: [],
      safetyLevel: "green",
      safetyReasons: [],
    },
    update: {
      caloriesKcal: 2100,
      proteinG: 130,
      carbsG: 220,
      fatG: 65,
      fibreG: 30,
      waterMl: 2450,
      weeklyWeightChangeG: -500,
    },
  });

  return user;
}

async function clearDemoData(prisma, userId) {
  await prisma.foodEntryItem.deleteMany({
    where: { foodEntry: { userId } },
  });
  await prisma.userCorrection.deleteMany({ where: { userId } });
  await prisma.foodEntry.deleteMany({ where: { userId } });
  await prisma.exerciseEntry.deleteMany({ where: { userId } });
  await prisma.waterEntry.deleteMany({ where: { userId } });
  await prisma.weightEntry.deleteMany({ where: { userId } });
  await prisma.fastingSession.deleteMany({ where: { userId } });
  await prisma.glucoseEntry.deleteMany({ where: { userId } });
}

async function seedDemoData(prisma, userId) {
  const meals = [
    {
      name: "Oats with banana",
      mealType: "breakfast",
      day: 0,
      hour: 8,
      energyKcal: 320,
      proteinG: 12,
      carbsG: 52,
      fatG: 8,
      fibreG: 6,
      sugarG: 18,
      isFavorite: true,
    },
    {
      name: "Chicken rice & dal",
      mealType: "lunch",
      day: 0,
      hour: 13,
      energyKcal: 680,
      proteinG: 38,
      carbsG: 72,
      fatG: 22,
      fibreG: 9,
      sugarG: 4,
    },
    {
      name: "Milk tea & biscuits",
      mealType: "snack",
      day: 0,
      hour: 16,
      energyKcal: 210,
      proteinG: 4,
      carbsG: 28,
      fatG: 9,
      fibreG: 1,
      sugarG: 22,
    },
    {
      name: "Grilled fish & salad",
      mealType: "dinner",
      day: 1,
      hour: 19,
      energyKcal: 520,
      proteinG: 42,
      carbsG: 18,
      fatG: 28,
      fibreG: 5,
      sugarG: 6,
    },
    {
      name: "Hopper & sambol",
      mealType: "breakfast",
      day: 1,
      hour: 7,
      energyKcal: 410,
      proteinG: 9,
      carbsG: 58,
      fatG: 14,
      fibreG: 3,
      sugarG: 8,
    },
    {
      name: "Kottu roti (small)",
      mealType: "dinner",
      day: 2,
      hour: 20,
      energyKcal: 890,
      proteinG: 24,
      carbsG: 95,
      fatG: 42,
      fibreG: 7,
      sugarG: 12,
    },
    {
      name: "Greek yogurt & berries",
      mealType: "snack",
      day: 3,
      hour: 10,
      energyKcal: 180,
      proteinG: 14,
      carbsG: 20,
      fatG: 4,
      fibreG: 2,
      sugarG: 16,
    },
    {
      name: "Vegetable roti",
      mealType: "breakfast",
      day: 5,
      hour: 8,
      energyKcal: 350,
      proteinG: 8,
      carbsG: 48,
      fatG: 12,
      fibreG: 4,
      sugarG: 5,
    },
    {
      name: "Rice & curry platter",
      mealType: "lunch",
      day: 7,
      hour: 12,
      energyKcal: 750,
      proteinG: 28,
      carbsG: 88,
      fatG: 26,
      fibreG: 10,
      sugarG: 9,
    },
    {
      name: "Protein shake",
      mealType: "snack",
      day: 10,
      hour: 17,
      energyKcal: 240,
      proteinG: 30,
      carbsG: 12,
      fatG: 6,
      fibreG: 2,
      sugarG: 8,
    },
  ];

  for (const m of meals) {
    await prisma.foodEntry.create({
      data: {
        userId,
        name: m.name,
        quantity: 1,
        unit: "serving",
        mealType: m.mealType,
        loggedAt: daysAgoAt(m.day, m.hour),
        dataSource: "database",
        energyKcal: m.energyKcal,
        proteinG: m.proteinG,
        carbsG: m.carbsG,
        fatG: m.fatG,
        fibreG: m.fibreG,
        sugarG: m.sugarG,
        sodiumMg: 400,
        isFavorite: m.isFavorite ?? false,
      },
    });
  }

  const waterSlots = [
    [0, 7, 250],
    [0, 10, 350],
    [0, 13, 500],
    [0, 16, 400],
    [1, 8, 300],
    [1, 12, 450],
    [1, 18, 500],
    [2, 9, 350],
    [2, 15, 400],
    [3, 8, 300],
    [3, 14, 350],
    [5, 11, 500],
    [7, 9, 400],
    [7, 17, 450],
  ];
  for (const [day, hour, ml] of waterSlots) {
    await prisma.waterEntry.create({
      data: {
        userId,
        amountMl: ml,
        loggedAt: daysAgoAt(day, hour),
      },
    });
  }

  const exercises = [
    { type: "walking", day: 0, hour: 7, durationMin: 35, kcal: 180 },
    { type: "cycling", day: 2, hour: 18, durationMin: 40, kcal: 320 },
    { type: "strength", day: 4, hour: 7, durationMin: 45, kcal: 260 },
    { type: "walking", day: 6, hour: 17, durationMin: 30, kcal: 150 },
  ];
  for (const e of exercises) {
    await prisma.exerciseEntry.create({
      data: {
        userId,
        type: e.type,
        durationMin: e.durationMin,
        intensity: "moderate",
        estimatedKcal: e.kcal,
        metUsed: 4.5,
        weightKgUsed: 72,
        performedAt: daysAgoAt(e.day, e.hour),
      },
    });
  }

  const weights = [
    [42, 73_800],
    [35, 73_400],
    [28, 73_100],
    [21, 72_700],
    [14, 72_400],
    [7, 72_150],
    [0, 72_000],
  ];
  for (const [day, weightG] of weights) {
    await prisma.weightEntry.create({
      data: {
        userId,
        weightG,
        recordedAt: daysAgoAt(day, 7, 30),
      },
    });
  }

  const completedFasts = [
    { daysBack: 2, durationMin: 16 * 60, label: "16:8" },
    { daysBack: 4, durationMin: 14 * 60, label: "16:8" },
    { daysBack: 6, durationMin: 18 * 60, label: "18:6" },
    { daysBack: 9, durationMin: 12 * 60, label: "12:12" },
  ];
  for (const f of completedFasts) {
    const started = daysAgoAt(f.daysBack, 20);
    const ended = new Date(started.getTime() + f.durationMin * 60 * 1000);
    await prisma.fastingSession.create({
      data: {
        userId,
        startedAt: started,
        endedAt: ended,
        plannedDurationMin: f.durationMin,
        protocolLabel: f.label,
      },
    });
  }

  await prisma.fastingSession.create({
    data: {
      userId,
      startedAt: hoursAgo(0.55),
      endedAt: null,
      plannedDurationMin: 18 * 60,
      protocolLabel: "18:6",
    },
  });

  const glucose = [
    { day: 0, hour: 7, value: 92, context: "fasting" },
    { day: 0, hour: 13, value: 128, context: "after_meal" },
    { day: 1, hour: 8, value: 88, context: "fasting" },
    { day: 1, hour: 21, value: 105, context: "bedtime" },
    { day: 3, hour: 7, value: 95, context: "fasting" },
    { day: 3, hour: 14, value: 142, context: "after_meal" },
    { day: 5, hour: 9, value: 101, context: "before_meal" },
    { day: 7, hour: 7, value: 89, context: "fasting" },
    { day: 10, hour: 16, value: 118, context: "other" },
    { day: 12, hour: 8, value: 97, context: "fasting" },
  ];
  for (const g of glucose) {
    await prisma.glucoseEntry.create({
      data: {
        userId,
        valueMgDl: g.value,
        measuredAt: daysAgoAt(g.day, g.hour),
        context: g.context,
      },
    });
  }
}

function printSummary() {
  console.log("\n========================================");
  console.log(" FitMe AI — local demo ready");
  console.log("========================================");
  console.log("Login:    ", DEMO_LOGIN_URL);
  console.log("Email:    ", DEMO_EMAIL);
  console.log("Password: ", DEMO_PASSWORD);
  console.log("\nSeeded for demo user:");
  console.log("  • Profile + calorie/macro/water targets");
  console.log("  • Meals (10) incl. sugar/fibre — today + history");
  console.log("  • Water logs (14) across multiple days");
  console.log("  • Exercise (4) + weight trend (7 weigh-ins)");
  console.log("  • Fasting: 1 active + 4 completed");
  console.log("  • Glucose readings (10) — fasting & after-meal");
  console.log("\nStart app:  npm run dev");
  console.log("Open:       http://localhost:3000/dashboard");
  console.log("========================================\n");
}

const prisma = new PrismaClient();

try {
  if (!args.has("--skip-docker")) {
    try {
      execSync("docker start fitme-pg", { stdio: "ignore", shell: true });
      console.log("Postgres container fitme-pg started (or already running).");
    } catch {
      console.warn("WARN: Could not start fitme-pg via Docker — ensure Postgres is on DATABASE_URL.");
    }
  }

  if (!args.has("--skip-migrate")) {
    console.log("Applying migrations…");
    run("npx prisma migrate deploy");
  }

  const user = await ensureDemoUser(prisma);
  await clearDemoData(prisma, user.id);
  await seedDemoData(prisma, user.id);
  printSummary();
} catch (e) {
  console.error("FAILED:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
