import { describe, it, expect, vi } from "vitest";
import { rematchFoodDraftAction } from "@/app/actions/log";
import type { FoodDetailDto } from "@/lib/domain/nutrition/types";

const egg: FoodDetailDto = {
  slug: "egg",
  name: "Egg",
  aliases: ["eggs"],
  kind: "simple",
  defaultServingG: 50,
  sourceLabel: "seed",
  servings: [{ name: "piece", grams: 50 }],
  ingredients: [],
  nutrition: {
    energyKcal: 72,
    proteinG: 6.3,
    carbsG: 0.4,
    fatG: 4.8,
    fibreG: 0,
    sugarG: 0.2,
    sodiumMg: 71,
  },
  dataSource: "database",
};

const baseInput = {
  id: "d1",
  name: "mystery stew",
  quantity: 1,
  unit: "bowl" as const,
  mealType: "lunch" as const,
  loggedAt: "2026-07-26T12:00:00.000Z",
  confidence: 0.6,
  origin: "ai_parse" as const,
  aiSnapshot: {
    name: "mystery stew",
    quantity: 1,
    unit: "bowl" as const,
    mealType: "lunch" as const,
    nutrition: {
      energyKcal: 400,
      proteinG: 10,
      carbsG: 50,
      fatG: 12,
      fibreG: 4,
      sugarG: 8,
      sodiumMg: 500,
    },
  },
  nutrition: {
    energyKcal: 400,
    proteinG: 10,
    carbsG: 50,
    fatG: 12,
    fibreG: 4,
    sugarG: 8,
    sodiumMg: 500,
  },
};

describe("rematchFoodDraftAction (FR-11)", () => {
  it("keeps ai_estimated when no catalog match", async () => {
    const result = await rematchFoodDraftAction(baseInput, {
      requireSession: async () => ({ id: "u1" }) as never,
      findFoodBySlugOrAlias: async () => null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.dataSource).toBe("ai_estimated");
      expect(result.data.nutrition.energyKcal).toBe(400);
    }
  });

  it("upgrades to database when a later catalog match exists", async () => {
    const result = await rematchFoodDraftAction(
      { ...baseInput, name: "egg" },
      {
        requireSession: async () => ({ id: "u1" }) as never,
        findFoodBySlugOrAlias: async (q) =>
          q.toLowerCase().includes("egg") ? egg : null,
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.dataSource).toBe("database");
      expect(result.data.foodSlug).toBe("egg");
      expect(result.data.name).toBe("Egg");
    }
  });

  it("requires session", async () => {
    const find = vi.fn();
    const result = await rematchFoodDraftAction(baseInput, {
      requireSession: async () => {
        throw new Error("nope");
      },
      findFoodBySlugOrAlias: find,
    });
    expect(result.ok).toBe(false);
    expect(find).not.toHaveBeenCalled();
  });
});
