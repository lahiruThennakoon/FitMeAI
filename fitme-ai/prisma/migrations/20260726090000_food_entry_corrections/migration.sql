-- CreateEnum
CREATE TYPE "NutritionDataSource" AS ENUM ('database', 'ai_estimated');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack', 'unknown');

-- CreateTable
CREATE TABLE "food_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "foodId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL,
    "dataSource" "NutritionDataSource" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "energyKcal" DOUBLE PRECISION,
    "proteinG" DOUBLE PRECISION,
    "carbsG" DOUBLE PRECISION,
    "fatG" DOUBLE PRECISION,
    "fibreG" DOUBLE PRECISION,
    "sugarG" DOUBLE PRECISION,
    "sodiumMg" DOUBLE PRECISION,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiInteractionId" TEXT,

    CONSTRAINT "food_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_entry_item" (
    "id" TEXT NOT NULL,
    "foodEntryId" TEXT NOT NULL,
    "ingredientSlug" TEXT,
    "name" TEXT NOT NULL,
    "grams" INTEGER NOT NULL,
    "proportionPct" DOUBLE PRECISION NOT NULL,
    "dataSource" "NutritionDataSource" NOT NULL,
    "energyKcal" DOUBLE PRECISION,
    "proteinG" DOUBLE PRECISION,
    "carbsG" DOUBLE PRECISION,
    "fatG" DOUBLE PRECISION,
    "fibreG" DOUBLE PRECISION,
    "sugarG" DOUBLE PRECISION,
    "sodiumMg" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_entry_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_interaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "model" TEXT,
    "purpose" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_correction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "foodEntryId" TEXT NOT NULL,
    "aiInteractionId" TEXT,
    "field" TEXT NOT NULL,
    "beforeValue" JSONB NOT NULL,
    "afterValue" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_correction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "food_entry_userId_loggedAt_idx" ON "food_entry"("userId", "loggedAt");

-- CreateIndex
CREATE INDEX "food_entry_userId_deletedAt_idx" ON "food_entry"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "food_entry_foodId_idx" ON "food_entry"("foodId");

-- CreateIndex
CREATE INDEX "food_entry_aiInteractionId_idx" ON "food_entry"("aiInteractionId");

-- CreateIndex
CREATE INDEX "food_entry_item_foodEntryId_idx" ON "food_entry_item"("foodEntryId");

-- CreateIndex
CREATE INDEX "ai_interaction_userId_createdAt_idx" ON "ai_interaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_correction_userId_createdAt_idx" ON "user_correction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_correction_foodEntryId_idx" ON "user_correction"("foodEntryId");

-- CreateIndex
CREATE INDEX "user_correction_aiInteractionId_idx" ON "user_correction"("aiInteractionId");

-- AddForeignKey
ALTER TABLE "food_entry" ADD CONSTRAINT "food_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_entry" ADD CONSTRAINT "food_entry_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_entry" ADD CONSTRAINT "food_entry_aiInteractionId_fkey" FOREIGN KEY ("aiInteractionId") REFERENCES "ai_interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_entry_item" ADD CONSTRAINT "food_entry_item_foodEntryId_fkey" FOREIGN KEY ("foodEntryId") REFERENCES "food_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_interaction" ADD CONSTRAINT "ai_interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_correction" ADD CONSTRAINT "user_correction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_correction" ADD CONSTRAINT "user_correction_foodEntryId_fkey" FOREIGN KEY ("foodEntryId") REFERENCES "food_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_correction" ADD CONSTRAINT "user_correction_aiInteractionId_fkey" FOREIGN KEY ("aiInteractionId") REFERENCES "ai_interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
