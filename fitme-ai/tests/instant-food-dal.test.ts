import { describe, it, expect, vi, beforeEach } from "vitest";

const findUniqueEntry = vi.fn();
const createEntry = vi.fn();
const updateEntry = vi.fn();
const findFood = vi.fn();
const findFoodRow = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    foodEntry: {
      findUnique: (...args: unknown[]) => findUniqueEntry(...args),
      create: (...args: unknown[]) => createEntry(...args),
      update: (...args: unknown[]) => updateEntry(...args),
    },
    food: {
      findUnique: (...args: unknown[]) => findFoodRow(...args),
    },
  },
}));

vi.mock("@/lib/dal/nutrition", () => ({
  findFoodBySlugOrAlias: (...args: unknown[]) => findFood(...args),
}));

import { upsertInstantFoodEntry } from "@/lib/dal/instant-food";

beforeEach(() => {
  vi.clearAllMocks();
  findFood.mockResolvedValue({
    slug: "egg",
    name: "Egg",
    defaultServingG: 50,
    nutrition: {
      energyKcal: 72,
      proteinG: 6,
      carbsG: 0.4,
      fatG: 5,
      fibreG: 0,
      sugarG: 0,
      sodiumMg: 70,
    },
  });
  findFoodRow.mockResolvedValue({ id: "food-1" });
});

describe("upsertInstantFoodEntry (AD-12)", () => {
  it("creates a new entry", async () => {
    findUniqueEntry.mockResolvedValue(null);
    createEntry.mockResolvedValue({
      id: "fe-1",
      name: "Egg",
      energyKcal: 72,
    });

    const result = await upsertInstantFoodEntry({
      userId: "u1",
      clientKey: "ck-aaaaaaaa",
      foodSlug: "egg",
      quantity: 1,
      unit: "piece",
      mealType: "breakfast",
      loggedAt: new Date("2026-07-26T08:00:00.000Z"),
    });

    expect(result?.created).toBe(true);
    expect(createEntry).toHaveBeenCalledOnce();
  });

  it("returns existing row for same clientKey (no duplicate)", async () => {
    findUniqueEntry.mockResolvedValue({
      id: "fe-1",
      userId: "u1",
      name: "Egg",
      energyKcal: 72,
      deletedAt: null,
    });

    const result = await upsertInstantFoodEntry({
      userId: "u1",
      clientKey: "ck-aaaaaaaa",
      foodSlug: "egg",
      quantity: 1,
      unit: "piece",
      mealType: "breakfast",
      loggedAt: new Date(),
    });

    expect(result?.created).toBe(false);
    expect(createEntry).not.toHaveBeenCalled();
  });
});
