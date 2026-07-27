-- Story 6.1: weight check-in history (canonical grams)
CREATE TABLE "weight_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weightG" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weight_entry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "weight_entry_userId_recordedAt_idx" ON "weight_entry"("userId", "recordedAt");
CREATE INDEX "weight_entry_userId_deletedAt_idx" ON "weight_entry"("userId", "deletedAt");

ALTER TABLE "weight_entry" ADD CONSTRAINT "weight_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
