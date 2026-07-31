import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readJson(name) {
  return JSON.parse(readFileSync(join(__dirname, name), "utf8"));
}

function defaultServingGrams(food) {
  return Object.values(food.recipe).reduce((a, b) => a + b, 0);
}

/** Load merged multi-region catalog (Story 12.1). */
export function loadCatalog() {
  const { ingredients } = readJson("ingredients.global.json");
  const foodFiles = readdirSync(__dirname).filter(
    (f) => f.startsWith("foods.") && f.endsWith(".json"),
  );

  const foods = [];
  for (const file of foodFiles.sort()) {
    const shard = readJson(file);
    const locale = shard.locale ?? "global";
    for (const food of shard.foods) {
      foods.push({ ...food, locale: food.locale ?? locale });
    }
  }

  return {
    ingredients,
    foods,
    requiredFoodSlugs: ["rice", "pol-sambol", "dhal-curry"],
  };
}

export function validateCatalog(catalog) {
  const ingredientSlugs = new Set();
  for (const ing of catalog.ingredients) {
    if (ingredientSlugs.has(ing.slug)) {
      throw new Error(`Duplicate ingredient slug in seed: ${ing.slug}`);
    }
    ingredientSlugs.add(ing.slug);
  }

  const foodSlugs = new Set();
  for (const food of catalog.foods) {
    if (foodSlugs.has(food.slug)) {
      throw new Error(`Duplicate food slug in seed: ${food.slug}`);
    }
    foodSlugs.add(food.slug);

    for (const [ingSlug, grams] of Object.entries(food.recipe)) {
      if (!ingredientSlugs.has(ingSlug)) {
        throw new Error(`Unknown ingredient slug in seed: ${ingSlug}`);
      }
      if (!Number.isInteger(grams) || grams <= 0) {
        throw new Error(
          `${food.slug} recipe ${ingSlug} must be a positive integer gram amount`,
        );
      }
    }
    for (const serving of food.servings) {
      if (!Number.isInteger(serving.grams) || serving.grams <= 0) {
        throw new Error(
          `${food.slug} serving ${serving.name} must be a positive integer gram amount`,
        );
      }
    }
    const dsg = defaultServingGrams(food);
    if (!Number.isInteger(dsg) || dsg <= 0) {
      throw new Error(`${food.slug} defaultServingG invalid`);
    }
  }
}
