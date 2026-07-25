import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(join(__dirname, "seed", "catalog-data.json"), "utf8"),
);

const prisma = new PrismaClient();

function defaultServingGrams(food) {
  return Object.values(food.recipe).reduce((a, b) => a + b, 0);
}

function assertPositiveGrams(label, grams) {
  if (!Number.isInteger(grams) || grams <= 0) {
    throw new Error(`${label} must be a positive integer gram amount, got ${grams}`);
  }
}

function validateCatalog() {
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

    const recipeEntries = Object.entries(food.recipe);
    if (recipeEntries.length === 0) {
      throw new Error(`Food ${food.slug} has empty recipe`);
    }
    for (const [ingSlug, grams] of recipeEntries) {
      if (!ingredientSlugs.has(ingSlug)) {
        throw new Error(`Unknown ingredient slug in seed: ${ingSlug}`);
      }
      assertPositiveGrams(`${food.slug} recipe ${ingSlug}`, grams);
    }
    for (const serving of food.servings) {
      assertPositiveGrams(`${food.slug} serving ${serving.name}`, serving.grams);
    }
    assertPositiveGrams(`${food.slug} defaultServingG`, defaultServingGrams(food));
  }
}

async function main() {
  validateCatalog();

  await prisma.$transaction(async (tx) => {
    for (const ing of catalog.ingredients) {
      await tx.ingredient.upsert({
        where: { slug: ing.slug },
        create: {
          slug: ing.slug,
          name: ing.name,
          aliases: ing.aliases ?? [],
          sourceLabel: ing.sourceLabel,
          energyKcal: ing.energyKcal,
          proteinG: ing.proteinG,
          carbsG: ing.carbsG,
          fatG: ing.fatG,
          fibreG: ing.fibreG,
          sugarG: ing.sugarG,
          sodiumMg: ing.sodiumMg,
        },
        update: {
          name: ing.name,
          aliases: ing.aliases ?? [],
          sourceLabel: ing.sourceLabel,
          energyKcal: ing.energyKcal,
          proteinG: ing.proteinG,
          carbsG: ing.carbsG,
          fatG: ing.fatG,
          fibreG: ing.fibreG,
          sugarG: ing.sugarG,
          sodiumMg: ing.sodiumMg,
        },
      });
    }

    const ingredients = await tx.ingredient.findMany();
    const bySlug = new Map(ingredients.map((i) => [i.slug, i]));

    for (const food of catalog.foods) {
      const defaultServingG = defaultServingGrams(food);

      const row = await tx.food.upsert({
        where: { slug: food.slug },
        create: {
          slug: food.slug,
          name: food.name,
          aliases: food.aliases ?? [],
          kind: food.kind,
          defaultServingG,
          sourceLabel: food.sourceLabel,
        },
        update: {
          name: food.name,
          aliases: food.aliases ?? [],
          kind: food.kind,
          defaultServingG,
          sourceLabel: food.sourceLabel,
        },
      });

      await tx.recipeIngredient.deleteMany({ where: { foodId: row.id } });
      for (const [ingSlug, grams] of Object.entries(food.recipe)) {
        const ingredient = bySlug.get(ingSlug);
        if (!ingredient) {
          throw new Error(`Unknown ingredient slug in seed: ${ingSlug}`);
        }
        await tx.recipeIngredient.create({
          data: {
            foodId: row.id,
            ingredientId: ingredient.id,
            grams,
          },
        });
      }

      await tx.foodServing.deleteMany({ where: { foodId: row.id } });
      const servings = [
        { name: "default", grams: defaultServingG },
        ...food.servings.filter((s) => s.name !== "default"),
      ];
      for (const serving of servings) {
        await tx.foodServing.create({
          data: {
            foodId: row.id,
            name: serving.name,
            grams: serving.grams,
          },
        });
      }
    }
  });

  console.log(
    `Seeded ${catalog.ingredients.length} ingredients and ${catalog.foods.length} foods.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
