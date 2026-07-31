import { PrismaClient } from "@prisma/client";
import { loadCatalog, validateCatalog } from "./seed/catalog/load-catalog.mjs";

const catalog = loadCatalog();
validateCatalog(catalog);

const prisma = new PrismaClient();

function defaultServingGrams(food) {
  return Object.values(food.recipe).reduce((a, b) => a + b, 0);
}

async function main() {
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
      const locale = food.locale ?? "global";

      const row = await tx.food.upsert({
        where: { slug: food.slug },
        create: {
          slug: food.slug,
          name: food.name,
          aliases: food.aliases ?? [],
          kind: food.kind,
          defaultServingG,
          sourceLabel: food.sourceLabel,
          locale,
        },
        update: {
          name: food.name,
          aliases: food.aliases ?? [],
          kind: food.kind,
          defaultServingG,
          sourceLabel: food.sourceLabel,
          locale,
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

    // Backfill LK locale for legacy rows missing shard tag (idempotent).
    await tx.food.updateMany({
      where: {
        slug: { in: ["rice", "pol-sambol", "dhal-curry"] },
        locale: "global",
      },
      data: { locale: "lk" },
    });
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
