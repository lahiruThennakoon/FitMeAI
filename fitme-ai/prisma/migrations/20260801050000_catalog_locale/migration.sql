-- Story 12.1: Multi-region catalog locale tags
CREATE TYPE "CatalogLocale" AS ENUM ('lk', 'us', 'in', 'eu', 'global');

ALTER TABLE "food" ADD COLUMN "locale" "CatalogLocale" NOT NULL DEFAULT 'global';

ALTER TABLE "user_profile" ADD COLUMN "catalogLocale" "CatalogLocale" NOT NULL DEFAULT 'global';

CREATE INDEX "food_locale_name_idx" ON "food"("locale", "name");
