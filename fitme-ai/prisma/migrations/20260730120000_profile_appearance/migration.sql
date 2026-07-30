-- Appearance preference (Settings → Display)
CREATE TYPE "AppearancePreference" AS ENUM ('system', 'light', 'dark');

ALTER TABLE "user_profile" ADD COLUMN "appearancePreference" "AppearancePreference" NOT NULL DEFAULT 'system';
