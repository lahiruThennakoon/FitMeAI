-- CreateTable
CREATE TABLE "water_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountMl" INTEGER NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "water_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "water_entry_userId_loggedAt_idx" ON "water_entry"("userId", "loggedAt");

-- CreateIndex
CREATE INDEX "water_entry_userId_deletedAt_idx" ON "water_entry"("userId", "deletedAt");

-- AddForeignKey
ALTER TABLE "water_entry" ADD CONSTRAINT "water_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
