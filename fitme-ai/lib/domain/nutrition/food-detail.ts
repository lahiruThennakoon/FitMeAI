import { scalePer100g, sumNutrition } from "@/lib/domain/nutrition/compose";
import type {
  FoodDetailDto,
  IngredientDto,
  NutritionMacros,
} from "@/lib/domain/nutrition/types";

import type { CatalogLocale } from "@/lib/domain/nutrition/catalog-locale";

export type FoodDetailInput = {
  slug: string;
  name: string;
  aliases: string[];
  kind: "simple" | "composite";
  locale: CatalogLocale;
  defaultServingG: number;
  sourceLabel: string;
  servings: { name: string; grams: number }[];
  recipe: { ingredient: IngredientDto; grams: number }[];
};

/** Pure builder — catalog lookups always stamp dataSource = database (AD-3). */
export function buildFoodDetail(input: FoodDetailInput): FoodDetailDto {
  const ingredients = input.recipe.map((line) => {
    const contribution = scalePer100g(line.ingredient.per100g, line.grams);
    return {
      ingredient: line.ingredient,
      grams: line.grams,
      contribution,
    };
  });
  const nutrition: NutritionMacros = sumNutrition(
    ingredients.map((i) => i.contribution),
  );
  return {
    slug: input.slug,
    name: input.name,
    aliases: input.aliases,
    kind: input.kind,
    locale: input.locale,
    defaultServingG: input.defaultServingG,
    sourceLabel: input.sourceLabel,
    servings: input.servings,
    ingredients,
    nutrition,
    dataSource: "database",
  };
}
