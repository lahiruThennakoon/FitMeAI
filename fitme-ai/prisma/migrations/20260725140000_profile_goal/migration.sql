-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('weight_loss', 'maintenance', 'muscle_gain', 'general_health');

-- CreateEnum
CREATE TYPE "PreferredUnits" AS ENUM ('metric', 'imperial');

-- CreateTable
CREATE TABLE "user_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "ageYears" INTEGER NOT NULL,
    "sex" "Sex" NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "currentWeightG" INTEGER NOT NULL,
    "targetWeightG" INTEGER NOT NULL,
    "activityLevel" "ActivityLevel" NOT NULL,
    "dietaryPreferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "goalType" "GoalType" NOT NULL,
    "preferredUnits" "PreferredUnits" NOT NULL DEFAULT 'metric',
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bmrKcal" INTEGER NOT NULL,
    "tdeeKcal" INTEGER NOT NULL,
    "caloriesKcal" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbsG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "fibreG" INTEGER NOT NULL,
    "waterMl" INTEGER NOT NULL,
    "steps" INTEGER NOT NULL,
    "exerciseMinutes" INTEGER NOT NULL,
    "weeklyWeightChangeG" INTEGER NOT NULL,
    "overriddenFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_userId_key" ON "user_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "goal_userId_key" ON "goal"("userId");

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal" ADD CONSTRAINT "goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
