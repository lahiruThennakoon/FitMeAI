-- Opt-in: credit exercise burn back into the day's food budget.
ALTER TABLE "user_profile"
  ADD COLUMN IF NOT EXISTS "eatBackExercise" BOOLEAN NOT NULL DEFAULT false;
