-- CreateEnum
CREATE TYPE "SafetyLevel" AS ENUM ('green', 'yellow', 'red');

-- AlterTable
ALTER TABLE "goal" ADD COLUMN     "safetyLevel" "SafetyLevel" NOT NULL DEFAULT 'green',
ADD COLUMN     "safetyReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "safetyConsentGiven" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "safetyConsentAt" TIMESTAMP(3);
