-- AlterTable
ALTER TABLE "food_entry" ADD COLUMN "clientKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "food_entry_userId_clientKey_key" ON "food_entry"("userId", "clientKey");
