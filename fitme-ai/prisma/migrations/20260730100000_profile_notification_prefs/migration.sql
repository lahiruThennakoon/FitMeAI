-- Tier 3: optional country + notification preference placeholders
ALTER TABLE "user_profile" ALTER COLUMN "country" SET DEFAULT '';
ALTER TABLE "user_profile" ADD COLUMN "notifyFastingEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_profile" ADD COLUMN "notifyWeeklyDigest" BOOLEAN NOT NULL DEFAULT false;
