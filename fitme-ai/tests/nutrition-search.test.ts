import { describe, it, expect, vi, beforeEach } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    food: {
      findMany,
      findUnique: vi.fn(),
    },
  },
}));

import { searchFoodsByQuery } from "@/lib/dal/nutrition";

beforeEach(() => {
  vi.clearAllMocks();
  findMany.mockResolvedValue([
    {
      slug: "oats",
      name: "Oats",
      aliases: ["rolled oats"],
      kind: "simple",
      defaultServingG: 40,
      sourceLabel: "seed",
      servings: [],
      recipeIngredients: [],
    },
    {
      slug: "rice",
      name: "White rice",
      aliases: [],
      kind: "simple",
      defaultServingG: 150,
      sourceLabel: "seed",
      servings: [],
      recipeIngredients: [],
    },
  ]);
});

describe("searchFoodsByQuery (Tier 3)", () => {
  it("ranks prefix matches ahead of substring matches", async () => {
    const hits = await searchFoodsByQuery("oat");
    expect(hits.map((h) => h.slug)).toEqual(["oats"]);
  });

  it("returns nothing for very short queries", async () => {
    expect(await searchFoodsByQuery("o")).toEqual([]);
  });
});
