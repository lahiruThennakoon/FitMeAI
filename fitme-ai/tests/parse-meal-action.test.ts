import { describe, it, expect, vi } from "vitest";
import { parseMealAction } from "@/app/actions/log";
import { FakeAiProvider } from "@/lib/ai/fake";
import type { FoodDetailDto } from "@/lib/domain/nutrition/types";

const recordAiInteraction = vi.fn(async () => ({ id: "ai-parse-1" }));

const milkTea: FoodDetailDto = {
  slug: "milk-tea",
  name: "Milk tea",
  aliases: ["teatime tea"],
  kind: "composite",
  defaultServingG: 230,
  sourceLabel: "seed",
  servings: [{ name: "cup", grams: 230 }],
  ingredients: [],
  nutrition: {
    energyKcal: 65,
    proteinG: 1.5,
    carbsG: 11,
    fatG: 1.5,
    fibreG: 0,
    sugarG: 10,
    sodiumMg: 20,
  },
  dataSource: "database",
};

describe("parseMealAction", () => {
  it("returns structured multi-item draft from AI + catalog", async () => {
    const provider = new FakeAiProvider(() =>
      JSON.stringify({
        items: [
          {
            name: "egg",
            quantity: 2,
            unit: "piece",
            confidence: 0.92,
          },
          {
            name: "milk tea",
            quantity: 1,
            unit: "cup",
            confidence: 0.88,
          },
          {
            name: "chickpeas",
            quantity: 100,
            unit: "g",
            confidence: 0.9,
          },
          {
            name: "dhal wade",
            quantity: 1,
            unit: "piece",
            confidence: 0.85,
          },
        ],
        inferredMealType: "snack",
      }),
    );

    const foods: Record<string, FoodDetailDto> = {
      egg: {
        ...milkTea,
        slug: "egg",
        name: "Egg",
        defaultServingG: 50,
        servings: [{ name: "piece", grams: 50 }],
        nutrition: {
          energyKcal: 72,
          proteinG: 6.3,
          carbsG: 0.4,
          fatG: 4.8,
          fibreG: 0,
          sugarG: 0.2,
          sodiumMg: 71,
        },
      },
      "milk tea": milkTea,
      chickpeas: {
        ...milkTea,
        slug: "chickpeas",
        name: "Chickpeas",
        defaultServingG: 100,
        servings: [{ name: "100g", grams: 100 }],
        nutrition: {
          energyKcal: 164,
          proteinG: 8.9,
          carbsG: 27.4,
          fatG: 2.6,
          fibreG: 7.6,
          sugarG: 4.8,
          sodiumMg: 7,
        },
      },
      "dhal wade": {
        ...milkTea,
        slug: "dhal-wade",
        name: "Dhal wade",
        defaultServingG: 66,
        servings: [{ name: "piece", grams: 66 }],
        nutrition: {
          energyKcal: 150,
          proteinG: 5,
          carbsG: 12,
          fatG: 8,
          fibreG: 2,
          sugarG: 1,
          sodiumMg: 10,
        },
      },
    };

    const result = await parseMealAction(
      {
        text: "two eggs, one milk tea, 100g chickpeas, one dhal wade",
      },
      {
        requireSession: async () => ({
          id: "u1",
          email: "a@b.com",
          name: null,
        }),
        createAiProvider: () => provider,
        findFoodBySlugOrAlias: async (q) => foods[q.toLowerCase()] ?? null,
        getClientKey: async () => "ip:test",
        rateLimit: () => ({ ok: true, remaining: 29 }),
        recordAiInteraction,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items).toHaveLength(4);
      expect(result.data.items.every((i) => i.dataSource === "database")).toBe(
        true,
      );
      expect(result.data.aiInteractionId).toBe("ai-parse-1");
    }
    expect(recordAiInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "succeeded",
        purpose: "food_parse",
        requestMeta: expect.objectContaining({ promptCharLength: expect.any(Number) }),
      }),
    );
  });

  it("fails safe to manual fallback when AI validation fails", async () => {
    recordAiInteraction.mockClear();
    const provider = new FakeAiProvider(() => JSON.stringify({ items: [] }));
    const result = await parseMealAction(
      { text: "something odd" },
      {
        requireSession: async () => ({
          id: "u1",
          email: "a@b.com",
          name: null,
        }),
        createAiProvider: () => provider,
        findFoodBySlugOrAlias: async () => null,
        getClientKey: async () => "ip:test",
        rateLimit: () => ({ ok: true, remaining: 29 }),
        recordAiInteraction,
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/manually/i);
    }
    expect(recordAiInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        errorCode: "validation_failed",
      }),
    );
  });

  it("rejects empty text", async () => {
    const result = await parseMealAction(
      { text: "   " },
      {
        requireSession: async () => ({
          id: "u1",
          email: "a@b.com",
          name: null,
        }),
        getClientKey: async () => "ip:test",
        rateLimit: () => ({ ok: true, remaining: 29 }),
        recordAiInteraction,
      },
    );
    expect(result.ok).toBe(false);
  });

  it("rate-limits food parse attempts", async () => {
    recordAiInteraction.mockClear();
    const result = await parseMealAction(
      { text: "two eggs" },
      {
        requireSession: async () => ({
          id: "u1",
          email: "a@b.com",
          name: null,
        }),
        getClientKey: async () => "ip:test",
        rateLimit: () => ({ ok: false, retryAfterSec: 60 }),
        recordAiInteraction,
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/too many/i);
    expect(recordAiInteraction).not.toHaveBeenCalled();
  });
});
