-- Epic 8: manual glucose readings (canonical mg/dL)
CREATE TYPE "GlucoseContext" AS ENUM ('fasting', 'before_meal', 'after_meal', 'bedtime', 'other');

CREATE TABLE "glucose_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "valueMgDl" DOUBLE PRECISION NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "context" "GlucoseContext" NOT NULL DEFAULT 'other',
    "note" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "glucose_entry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "glucose_entry_userId_measuredAt_idx" ON "glucose_entry"("userId", "measuredAt");
CREATE INDEX "glucose_entry_userId_deletedAt_idx" ON "glucose_entry"("userId", "deletedAt");

ALTER TABLE "glucose_entry" ADD CONSTRAINT "glucose_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
