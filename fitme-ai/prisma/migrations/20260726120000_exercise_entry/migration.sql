-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('walking', 'running', 'treadmill', 'cycling', 'strength', 'swimming', 'sports', 'custom');

-- CreateEnum
CREATE TYPE "ExerciseIntensity" AS ENUM ('low', 'moderate', 'high');

-- CreateTable
CREATE TABLE "exercise_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "customLabel" TEXT,
    "durationMin" INTEGER NOT NULL,
    "intensity" "ExerciseIntensity" NOT NULL,
    "distanceM" INTEGER,
    "sets" INTEGER,
    "reps" INTEGER,
    "weightG" INTEGER,
    "notes" TEXT,
    "estimatedKcal" INTEGER NOT NULL,
    "metUsed" DOUBLE PRECISION NOT NULL,
    "weightKgUsed" DOUBLE PRECISION NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercise_entry_userId_performedAt_idx" ON "exercise_entry"("userId", "performedAt");

-- CreateIndex
CREATE INDEX "exercise_entry_userId_deletedAt_idx" ON "exercise_entry"("userId", "deletedAt");

-- AddForeignKey
ALTER TABLE "exercise_entry" ADD CONSTRAINT "exercise_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
