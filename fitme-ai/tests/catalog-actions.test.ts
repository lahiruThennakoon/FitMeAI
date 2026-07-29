import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadCatalogFoodDraftAction,
  searchFoodCatalogAction,
} from "@/app/actions/catalog";

const searchFoodsByQuery = vi.fn();
const findFoodBySlugOrAlias = vi.fn();

const session = async () =>
  ({ id: "u1", email: "a@b.com", name: null }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  searchFoodsByQuery.mockResolvedValue([
    { slug: "oats", name: "Oats", energyKcal: 150 },
  ]);
  findFoodBySlugOrAlias.mockResolvedValue({
    slug: "oats",
    name: "Oats",
    kind: "simple",
    defaultServingG: 40,
    nutrition: {
      energyKcal: 150,
      proteinG: 5,
      carbsG: 27,
      fatG: 3,
      fibreG: 4,
      sugarG: 1,
      sodiumMg: 2,
    },
    servings: [{ name: "bowl", grams: 40 }],
    aliases: [],
    sourceLabel: "seed",
    recipe: [],
  });
});

describe("searchFoodCatalogAction (Tier 3)", () => {
  it("returns catalog hits for a signed-in user", async () => {
    const result = await searchFoodCatalogAction(
      { query: "oat" },
      { requireSession: session, searchFoodsByQuery },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.hits[0].slug).toBe("oats");
  });

  it("requires sign-in", async () => {
    const result = await searchFoodCatalogAction(
      { query: "oat" },
      {
        requireSession: async () => {
          throw new Error("no session");
        },
        searchFoodsByQuery,
      },
    );
    expect(result.ok).toBe(false);
  });
});

describe("loadCatalogFoodDraftAction (Tier 3)", () => {
  it("builds a review draft from a slug", async () => {
    const result = await loadCatalogFoodDraftAction(
      { slug: "oats" },
      { requireSession: session, findFoodBySlugOrAlias },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name).toBe("Oats");
    expect(result.data.foodSlug).toBe("oats");
  });
});
