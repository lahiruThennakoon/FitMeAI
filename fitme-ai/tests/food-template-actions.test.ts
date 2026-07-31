import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadFoodTemplateDraftAction,
  relogFoodTemplateAction,
  setFavoriteFoodAction,
} from "@/app/actions/food-template";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";

const setFavorite = vi.fn();
const getFoodEntryForDraft = vi.fn();
const findFoodBySlugOrAlias = vi.fn();
const relogFoodEntryNow = vi.fn();

const session = async () =>
  ({ id: "u1", email: "a@b.com", name: null }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  setFavorite.mockResolvedValue({
    sourceEntryId: "e1",
    name: "Oats",
    quantity: 1,
    unit: "serving",
    mealType: "breakfast",
    energyKcal: 150,
    dataSource: "database",
    foodSlug: "oats",
    isFavorite: true,
  });
  getFoodEntryForDraft.mockResolvedValue({
    id: "e1",
    name: "Chicken curry",
    quantity: 1,
    unit: "serving",
    mealType: "lunch",
    dataSource: "ai_estimated",
    confidence: 0.95,
    energyKcal: 343,
    proteinG: 28,
    carbsG: 12,
    fatG: 18,
    fibreG: 2,
    sugarG: 4,
    sodiumMg: 400,
    foodSlug: null,
  });
  findFoodBySlugOrAlias.mockResolvedValue(null);
  relogFoodEntryNow.mockResolvedValue({
    id: "e2",
    name: "Chicken curry",
    energyKcal: 343,
  });
});

describe("setFavoriteFoodAction (Story 5.5)", () => {
  it("pins a meal", async () => {
    const result = await setFavoriteFoodAction(
      { id: "e1", isFavorite: true },
      { requireSession: session, setFoodEntryFavorite: setFavorite },
    );

    expect(result.ok).toBe(true);
    expect(setFavorite).toHaveBeenCalledWith("u1", "e1", true);
  });

  it("requires sign-in", async () => {
    const result = await setFavoriteFoodAction(
      { id: "e1", isFavorite: true },
      {
        requireSession: async () => {
          throw new Error("no session");
        },
        setFoodEntryFavorite: setFavorite,
      },
    );

    expect(result.ok).toBe(false);
    expect(setFavorite).not.toHaveBeenCalled();
  });

  it("collapses ownership failures", async () => {
    setFavorite.mockRejectedValueOnce(new NotFoundError());
    const a = await setFavoriteFoodAction(
      { id: "missing", isFavorite: true },
      { requireSession: session, setFoodEntryFavorite: setFavorite },
    );
    setFavorite.mockRejectedValueOnce(new UnauthorizedError());
    const b = await setFavoriteFoodAction(
      { id: "e1", isFavorite: true },
      { requireSession: session, setFoodEntryFavorite: setFavorite },
    );

    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
    if (!a.ok && !b.ok) expect(a.error).toBe(b.error);
  });
});

describe("loadFoodTemplateDraftAction (Story 5.5 edit-first)", () => {
  it("returns an editable draft without persisting", async () => {
    const result = await loadFoodTemplateDraftAction(
      { sourceEntryId: "e1" },
      {
        requireSession: session,
        getFoodEntryForDraft,
        findFoodBySlugOrAlias,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Chicken curry");
      expect(result.data.nutrition.energyKcal).toBe(343);
      expect(result.data.origin).toBe("manual");
    }
    expect(getFoodEntryForDraft).toHaveBeenCalledWith("u1", "e1");
  });

  it("enriches catalog foods for quantity rescale", async () => {
    getFoodEntryForDraft.mockResolvedValueOnce({
      id: "e2",
      name: "Oats",
      quantity: 1,
      unit: "serving",
      mealType: "breakfast",
      dataSource: "database",
      confidence: 1,
      energyKcal: 320,
      proteinG: 10,
      carbsG: 50,
      fatG: 6,
      fibreG: 8,
      sugarG: 1,
      sodiumMg: 5,
      foodSlug: "oats",
    });
    findFoodBySlugOrAlias.mockResolvedValueOnce({
      slug: "oats",
      name: "Oats",
      kind: "simple",
      defaultServingG: 100,
      nutrition: {
        energyKcal: 389,
        proteinG: 17,
        carbsG: 66,
        fatG: 7,
        fibreG: 10,
        sugarG: 1,
        sodiumMg: 2,
      },
      servings: [{ name: "serving", grams: 100 }],
    });

    const result = await loadFoodTemplateDraftAction(
      { sourceEntryId: "e2" },
      {
        requireSession: session,
        getFoodEntryForDraft,
        findFoodBySlugOrAlias,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.foodSlug).toBe("oats");
      expect(result.data.catalog?.defaultServingG).toBe(100);
      expect(result.data.nutrition.energyKcal).toBe(320);
    }
  });
});

describe("relogFoodTemplateAction (Tier 3 log now)", () => {
  it("saves a copy at the current time", async () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    const result = await relogFoodTemplateAction(
      { sourceEntryId: "e1" },
      {
        requireSession: session,
        relogFoodEntryNow,
        now: () => now,
      },
    );

    expect(result.ok).toBe(true);
    expect(relogFoodEntryNow).toHaveBeenCalledWith("u1", "e1", now);
  });
});
