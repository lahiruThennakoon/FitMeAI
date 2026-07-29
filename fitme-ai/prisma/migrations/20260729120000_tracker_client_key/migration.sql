-- Offline reconcile idempotency (AD-12) for the trackers that can now be
-- captured while disconnected: water, exercise, glucose, weight.
ALTER TABLE "water_entry" ADD COLUMN "clientKey" TEXT;
ALTER TABLE "exercise_entry" ADD COLUMN "clientKey" TEXT;
ALTER TABLE "glucose_entry" ADD COLUMN "clientKey" TEXT;
ALTER TABLE "weight_entry" ADD COLUMN "clientKey" TEXT;

CREATE UNIQUE INDEX "water_entry_userId_clientKey_key" ON "water_entry"("userId", "clientKey");
CREATE UNIQUE INDEX "exercise_entry_userId_clientKey_key" ON "exercise_entry"("userId", "clientKey");
CREATE UNIQUE INDEX "glucose_entry_userId_clientKey_key" ON "glucose_entry"("userId", "clientKey");
CREATE UNIQUE INDEX "weight_entry_userId_clientKey_key" ON "weight_entry"("userId", "clientKey");
