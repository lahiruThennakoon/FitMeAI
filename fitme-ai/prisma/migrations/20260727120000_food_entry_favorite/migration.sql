-- Story 5.5: pin FoodEntry rows for Recent & favorites on Log
ALTER TABLE "food_entry" ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "food_entry_userId_isFavorite_idx" ON "food_entry"("userId", "isFavorite");
