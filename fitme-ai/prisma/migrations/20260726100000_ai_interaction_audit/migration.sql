-- CreateEnum
CREATE TYPE "AiInteractionStatus" AS ENUM ('succeeded', 'failed');

-- AlterTable
ALTER TABLE "ai_interaction" ADD COLUMN "status" "AiInteractionStatus" NOT NULL DEFAULT 'succeeded';
ALTER TABLE "ai_interaction" ADD COLUMN "errorCode" TEXT;
ALTER TABLE "ai_interaction" ADD COLUMN "requestMeta" JSONB;
ALTER TABLE "ai_interaction" ADD COLUMN "responseSummary" JSONB;

-- CreateIndex
CREATE INDEX "ai_interaction_userId_status_idx" ON "ai_interaction"("userId", "status");
