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
      catalogLocale: "lk",
      timezone: "Asia/Colombo",
    },
    update: {
      displayName: DEMO_NAME,
      currentWeightG: 72_000,
      targetWeightG: 70_000,
      catalogLocale: "lk",
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

const FOOD_INCLUDE = {
  recipeIngredients: { include: { ingredient: true } },
};

function scaleFromPer100g(value, grams) {
  if (value == null) return null;
  return Math.round(value * (grams / 100) * 10) / 10;
}

function nutritionForCatalogFood(food, quantity = 1) {
  const totals = {
    energyKcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fibreG: 0,
    sugarG: 0,
    sodiumMg: 0,
  };
  for (const line of food.recipeIngredients) {
    const grams = line.grams * quantity;
    const ing = line.ingredient;
    totals.energyKcal += scaleFromPer100g(ing.energyKcal, grams) ?? 0;
    totals.proteinG += scaleFromPer100g(ing.proteinG, grams) ?? 0;
    totals.carbsG += scaleFromPer100g(ing.carbsG, grams) ?? 0;
    totals.fatG += scaleFromPer100g(ing.fatG, grams) ?? 0;
    totals.fibreG += scaleFromPer100g(ing.fibreG, grams) ?? 0;
    totals.sugarG += scaleFromPer100g(ing.sugarG, grams) ?? 0;
    totals.sodiumMg += scaleFromPer100g(ing.sodiumMg, grams) ?? 0;
  }
  return totals;
}

async function createCatalogMeal(prisma, userId, opts) {
  const {
    foodSlug,
    mealType,
    day,
    hour,
    minute = 0,
    quantity = 1,
    unit = "serving",
    isFavorite = false,
  } = opts;

  const food = await prisma.food.findUnique({
    where: { slug: foodSlug },
    include: FOOD_INCLUDE,
  });
  if (!food) {
    throw new Error(
      `Catalog food "${foodSlug}" missing — run npm run db:seed before demo seed.`,
    );
  }

  const nutrition = nutritionForCatalogFood(food, quantity);
  await prisma.foodEntry.create({
    data: {
      userId,
      foodId: food.id,
      name: food.name,
      quantity,
      unit,
      mealType,
      loggedAt: daysAgoAt(day, hour, minute),
      dataSource: "database",
      confidence: 1,
      energyKcal: nutrition.energyKcal,
      proteinG: nutrition.proteinG,
      carbsG: nutrition.carbsG,
      fatG: nutrition.fatG,
      fibreG: nutrition.fibreG,
      sugarG: nutrition.sugarG,
      sodiumMg: nutrition.sodiumMg,
      isFavorite,
    },
  });
}

async function seedDemoData(prisma, userId) {
  /** Individual catalog foods only — no combined pairs like "Milk tea & biscuits". */
  const meals = [
    { foodSlug: "oats-porridge", mealType: "breakfast", day: 0, hour: 8, minute: 0 },
    {
      foodSlug: "banana",
      mealType: "breakfast",
      day: 0,
      hour: 8,
      minute: 5,
      isFavorite: true,
    },
    { foodSlug: "rice", mealType: "lunch", day: 0, hour: 13, minute: 0 },
    { foodSlug: "dhal-curry", mealType: "lunch", day: 0, hour: 13, minute: 5 },
    { foodSlug: "chicken-curry", mealType: "lunch", day: 0, hour: 13, minute: 10 },
    { foodSlug: "milk-tea", mealType: "snack", day: 0, hour: 16, minute: 0 },
    { foodSlug: "marie-biscuits", mealType: "snack", day: 0, hour: 16, minute: 5 },
    { foodSlug: "fish-curry", mealType: "dinner", day: 1, hour: 19, minute: 0 },
    { foodSlug: "green-salad", mealType: "dinner", day: 1, hour: 19, minute: 5 },
    { foodSlug: "hoppers", mealType: "breakfast", day: 1, hour: 7, minute: 0 },
    { foodSlug: "pol-sambol", mealType: "breakfast", day: 1, hour: 7, minute: 5 },
    { foodSlug: "kottu", mealType: "dinner", day: 2, hour: 20 },
    { foodSlug: "greek-yogurt-cup", mealType: "snack", day: 3, hour: 10, minute: 0 },
    { foodSlug: "banana", mealType: "snack", day: 3, hour: 10, minute: 5 },
    { foodSlug: "boiled-potato", mealType: "lunch", day: 4, hour: 12 },
    { foodSlug: "vegetable-roti", mealType: "breakfast", day: 5, hour: 8 },
    { foodSlug: "rice", mealType: "lunch", day: 7, hour: 12, minute: 0 },
    { foodSlug: "dhal-curry", mealType: "lunch", day: 7, hour: 12, minute: 5 },
    { foodSlug: "chicken-curry", mealType: "lunch", day: 7, hour: 12, minute: 10 },
    { foodSlug: "protein-shake", mealType: "snack", day: 10, hour: 17 },
  ];

  for (const meal of meals) {
    await createCatalogMeal(prisma, userId, meal);
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
  console.log("  • Meals (20) — individual catalog foods, no pairs");
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

  if (!args.has("--skip-seed")) {
    console.log("Seeding nutrition catalog…");
    run("npm run db:seed");
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
