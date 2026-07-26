import "server-only";
import { prisma } from "@/lib/db";
import { buildFoodDetail } from "@/lib/domain/nutrition/food-detail";
import type { FoodDetailDto, IngredientDto } from "@/lib/domain/nutrition/types";

function toIngredientDto(row: {
  slug: string;
  name: string;
  aliases: string[];
  sourceLabel: string;
  energyKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fibreG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
}): IngredientDto {
  return {
    slug: row.slug,
    name: row.name,
    aliases: row.aliases,
    sourceLabel: row.sourceLabel,
    per100g: {
      energyKcal: row.energyKcal,
      proteinG: row.proteinG,
      carbsG: row.carbsG,
      fatG: row.fatG,
      fibreG: row.fibreG,
      sugarG: row.sugarG,
      sodiumMg: row.sodiumMg,
    },
  };
}

function toFoodDetail(row: {
  slug: string;
  name: string;
  aliases: string[];
  kind: "simple" | "composite";
  defaultServingG: number;
  sourceLabel: string;
  servings: { name: string; grams: number }[];
  recipeIngredients: {
    grams: number;
    ingredient: {
      slug: string;
      name: string;
      aliases: string[];
      sourceLabel: string;
      energyKcal: number | null;
      proteinG: number | null;
      carbsG: number | null;
      fatG: number | null;
      fibreG: number | null;
      sugarG: number | null;
      sodiumMg: number | null;
    };
  }[];
}): FoodDetailDto {
  return buildFoodDetail({
    slug: row.slug,
    name: row.name,
    aliases: row.aliases,
    kind: row.kind,
    defaultServingG: row.defaultServingG,
    sourceLabel: row.sourceLabel,
    servings: row.servings.map((s) => ({ name: s.name, grams: s.grams })),
    recipe: row.recipeIngredients.map((line) => ({
      ingredient: toIngredientDto(line.ingredient),
      grams: line.grams,
    })),
  });
}

const foodInclude = {
  servings: { orderBy: { name: "asc" as const } },
  recipeIngredients: {
    include: { ingredient: true },
    orderBy: { grams: "desc" as const },
  },
};

/**
 * Look up a catalog food by slug or alias (case-insensitive).
 * Returns ingredient-level nutrition with dataSource = database (AD-3).
 */
export async function findFoodBySlugOrAlias(
  query: string,
): Promise<FoodDetailDto | null> {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const bySlug = await prisma.food.findUnique({
    where: { slug: q },
    include: foodInclude,
  });
  if (bySlug) return toFoodDetail(bySlug);

  // MVP catalog is small; alias match scans names/aliases in memory.
  // Ordered by slug so collisions resolve deterministically until unique aliases land.
  const candidates = await prisma.food.findMany({
    select: { id: true, name: true, aliases: true },
    orderBy: { slug: "asc" },
  });
  const matchMeta = candidates.find(
    (f) =>
      f.name.toLowerCase() === q ||
      f.aliases.some((a) => a.toLowerCase() === q),
  );
  if (!matchMeta) return null;

  const match = await prisma.food.findUnique({
    where: { id: matchMeta.id },
    include: foodInclude,
  });
  return match ? toFoodDetail(match) : null;
}

export async function listFoodSlugs(): Promise<string[]> {
  const rows = await prisma.food.findMany({
    select: { slug: true },
    orderBy: { slug: "asc" },
  });
  return rows.map((r) => r.slug);
}

/** Compact catalog rows for offline / instant-path cache (Story 4.1). */
export type OfflineFoodCacheItem = {
  slug: string;
  name: string;
  aliases: string[];
  defaultServingG: number;
  nutrition: FoodDetailDto["nutrition"];
  dataSource: "database";
};

export async function listFoodsForOfflineCache(
  limit = 40,
): Promise<OfflineFoodCacheItem[]> {
  const rows = await prisma.food.findMany({
    take: Math.min(100, Math.max(1, limit)),
    orderBy: { slug: "asc" },
    include: foodInclude,
  });
  return rows.map((row) => {
    const detail = toFoodDetail(row);
    return {
      slug: detail.slug,
      name: detail.name,
      aliases: detail.aliases,
      defaultServingG: detail.defaultServingG,
      nutrition: detail.nutrition,
      dataSource: "database" as const,
    };
  });
}
