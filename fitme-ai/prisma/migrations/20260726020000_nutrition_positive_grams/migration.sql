-- Enforce positive gram quantities for nutrition catalog (Story 2.1 review).
ALTER TABLE "food" ADD CONSTRAINT "food_defaultServingG_positive" CHECK ("defaultServingG" > 0);
ALTER TABLE "food_serving" ADD CONSTRAINT "food_serving_grams_positive" CHECK ("grams" > 0);
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_grams_positive" CHECK ("grams" > 0);
