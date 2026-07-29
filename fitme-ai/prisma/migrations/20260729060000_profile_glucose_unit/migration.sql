-- Glucose display preference on the profile (storage stays canonical mg/dL)
CREATE TYPE "GlucoseUnit" AS ENUM ('mg_dl', 'mmol_l');

ALTER TABLE "user_profile"
  ADD COLUMN "preferredGlucoseUnit" "GlucoseUnit" NOT NULL DEFAULT 'mg_dl';
