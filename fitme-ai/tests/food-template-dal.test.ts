import { describe, it, expect, vi, beforeEach } from "vitest";

const findMany = vi.fn();
const findFirst = vi.fn();
const findUnique = vi.fn();
const updateRow = vi.fn();
const createRow = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    foodEntry: {
      findMany: (...args: unknown[]) => findMany(...args),
      findFirst: (...args: unknown[]) => findFirst(...args),
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => updateRow(...args),
      create: (...args: unknown[]) => createRow(...args),
    },
  },
}));

import {
  listFavoriteFoodTemplates,
  listRecentFoodTemplates,
  relogFromFoodEntry,
  setFoodEntryFavorite,
} from "@/lib/dal/food-template";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "e1",
    userId: "u1",
    foodId: "food1",
    name: "Oats",
    quantity: 1,
    unit: "serving",
    mealType: "breakfast",
    energyKcal: 150,
    dataSource: "database",
    isFavorite: false,
    food: { slug: "oats" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listRecentFoodTemplates (Story 5.5)", () => {
  it("dedupes by foodId and keeps newest first", async () => {
    findMany.mockResolvedValue([
      row({ id: "e2", name: "Oats bowl" }),
      row({ id: "e1", name: "Oats" }),
      row({
        id: "e3",
        foodId: null,
        name: "Custom smoothie",
        food: null,
        dataSource: "ai_estimated",
      }),
    ]);

    const list = await listRecentFoodTemplates("u1", 8);

    expect(list).toHaveLength(2);
    expect(list[0]?.sourceEntryId).toBe("e2");
    expect(list[0]?.foodSlug).toBe("oats");
    expect(list[1]?.name).toBe("Custom smoothie");
  });
});

describe("listFavoriteFoodTemplates (Story 5.5)", () => {
  it("returns favorited templates", async () => {
    findMany.mockResolvedValue([row({ id: "f1", isFavorite: true })]);

    const list = await listFavoriteFoodTemplates("u1");

    expect(list).toEqual([
      expect.objectContaining({
        sourceEntryId: "f1",
        isFavorite: true,
        foodSlug: "oats",
      }),
    ]);
  });
});

describe("setFoodEntryFavorite (Story 5.5)", () => {
  it("pins an owned entry", async () => {
    findFirst.mockResolvedValue(row());
    updateRow.mockResolvedValue(row({ isFavorite: true }));

    const dto = await setFoodEntryFavorite("u1", "e1", true);

    expect(updateRow).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: { isFavorite: true },
      select: expect.any(Object),
    });
    expect(dto.isFavorite).toBe(true);
  });

  it("rejects cross-user", async () => {
    findFirst.mockResolvedValue(row({ userId: "other" }));

    await expect(setFoodEntryFavorite("u1", "e1", true)).rejects.toThrow(
      UnauthorizedError,
    );
  });
});

describe("relogFromFoodEntry (Story 5.5)", () => {
  it("creates a new entry copying macros and dataSource", async () => {
    findFirst.mockResolvedValue({
      ...row(),
      confidence: 1,
      proteinG: 5,
      carbsG: 27,
      fatG: 3,
      fibreG: 4,
      sugarG: 1,
      sodiumMg: 0,
    });
    findUnique.mockResolvedValue(null);
    createRow.mockResolvedValue({
      id: "new1",
      name: "Oats",
      energyKcal: 150,
    });

    const result = await relogFromFoodEntry("u1", "e1", "ck-1");

    expect(result.created).toBe(true);
    expect(createRow).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        name: "Oats",
        dataSource: "database",
        energyKcal: 150,
        clientKey: "ck-1",
        isFavorite: false,
        aiInteractionId: null,
      }),
    });
  });

  it("is idempotent for the same clientKey", async () => {
    findFirst.mockResolvedValue({
      ...row(),
      confidence: 1,
      proteinG: 5,
      carbsG: 27,
      fatG: 3,
      fibreG: 4,
      sugarG: 1,
      sodiumMg: 0,
    });
    findUnique.mockResolvedValue({
      id: "existing",
      name: "Oats",
      energyKcal: 150,
      deletedAt: null,
    });

    const result = await relogFromFoodEntry("u1", "e1", "ck-1");

    expect(result.created).toBe(false);
    expect(result.id).toBe("existing");
    expect(createRow).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when source is missing", async () => {
    findFirst.mockResolvedValue(null);

    await expect(relogFromFoodEntry("u1", "missing")).rejects.toThrow(
      NotFoundError,
    );
  });
});
