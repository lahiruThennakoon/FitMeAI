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
  listFoodEntryDraftsForRange,
  listRecentFoodTemplates,
  setFoodEntryFavorite,
} from "@/lib/dal/food-template";
import { UnauthorizedError } from "@/lib/dal/guards";

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

describe("listFoodEntryDraftsForRange (Tier 3 copy a past day)", () => {
  const start = new Date("2026-07-27T00:00:00.000Z");
  const end = new Date("2026-07-28T00:00:00.000Z");

  it("reads one day, oldest first, skipping removed meals", async () => {
    findMany.mockResolvedValue([]);

    await listFoodEntryDraftsForRange("u1", start, end);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "u1",
          deletedAt: null,
          loggedAt: { gte: start, lt: end },
        },
        orderBy: { loggedAt: "asc" },
        take: 20,
      }),
    );
  });

  it("flattens the catalog slug and keeps the original time", async () => {
    findMany.mockResolvedValue([
      {
        ...row(),
        confidence: 1,
        proteinG: 5,
        carbsG: 27,
        fatG: 3,
        fibreG: 4,
        sugarG: 1,
        sodiumMg: 0,
        loggedAt: new Date("2026-07-27T07:30:00.000Z"),
      },
    ]);

    const rows = await listFoodEntryDraftsForRange("u1", start, end);

    expect(rows).toHaveLength(1);
    expect(rows[0].foodSlug).toBe("oats");
    expect(rows[0].loggedAt.toISOString()).toBe("2026-07-27T07:30:00.000Z");
  });

  it("caps a single copy at one reviewable batch", async () => {
    findMany.mockResolvedValue([]);

    await listFoodEntryDraftsForRange("u1", start, end, 5);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });
});
