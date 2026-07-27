-- Story 7.1: fasting session start/stop
CREATE TABLE "fasting_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "plannedDurationMin" INTEGER,
    "protocolLabel" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fasting_session_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fasting_session_userId_startedAt_idx" ON "fasting_session"("userId", "startedAt");
CREATE INDEX "fasting_session_userId_endedAt_idx" ON "fasting_session"("userId", "endedAt");
CREATE INDEX "fasting_session_userId_deletedAt_idx" ON "fasting_session"("userId", "deletedAt");

ALTER TABLE "fasting_session" ADD CONSTRAINT "fasting_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
