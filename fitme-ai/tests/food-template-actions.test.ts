import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  copyDayMealsAction,
  loadFoodTemplateDraftAction,
  relogFoodTemplateAction,
  setFavoriteFoodAction,
} from "@/app/actions/food-template";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";

const setFavorite = vi.fn();
const getFoodEntryForDraft = vi.fn();
const findFoodBySlugOrAlias = vi.fn();
const listFoodEntryDraftsForRange = vi.fn();
const getProfileForUser = vi.fn();
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
  listFoodEntryDraftsForRange.mockResolvedValue([]);
  getProfileForUser.mockResolvedValue({ timezone: "UTC" });
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

describe("copyDayMealsAction (Tier 3 copy a past day)", () => {
  const entry = (loggedAt: string, name: string) => ({
    id: `e-${name}`,
    name,
    quantity: 1,
    unit: "serving",
    mealType: "breakfast",
    dataSource: "ai_estimated",
    confidence: 1,
    energyKcal: 200,
    proteinG: 10,
    carbsG: 20,
    fatG: 5,
    fibreG: 2,
    sugarG: 3,
    sodiumMg: 100,
    foodSlug: null,
    loggedAt: new Date(loggedAt),
  });

  const copyDeps = {
    requireSession: session,
    listFoodEntryDraftsForRange,
    getProfileForUser,
    findFoodBySlugOrAlias,
  };

  it("keeps each meal's time of day but moves it onto today", async () => {
    listFoodEntryDraftsForRange.mockResolvedValueOnce([
      entry("2026-07-27T07:30:00.000Z", "Oats"),
      entry("2026-07-27T13:00:00.000Z", "Rice"),
    ]);

    const result = await copyDayMealsAction(
      { dayKey: "2026-07-27" },
      { ...copyDeps, now: () => new Date("2026-07-28T20:00:00.000Z") },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.drafts.map((d) => d.loggedAt)).toEqual([
      "2026-07-28T07:30:00.000Z",
      "2026-07-28T13:00:00.000Z",
    ]);
  });

  it("pulls a meal logged later than the current time back to now", async () => {
    listFoodEntryDraftsForRange.mockResolvedValueOnce([
      entry("2026-07-27T07:30:00.000Z", "Oats"),
      entry("2026-07-27T20:00:00.000Z", "Dinner"),
    ]);
    const now = new Date("2026-07-28T14:00:00.000Z");

    const result = await copyDayMealsAction(
      { dayKey: "2026-07-27" },
      { ...copyDeps, now: () => now },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.drafts[1].loggedAt).toBe(now.toISOString());
    expect(result.data.message).toContain("moved to now");
  });

  it("loads drafts without writing anything", async () => {
    listFoodEntryDraftsForRange.mockResolvedValueOnce([
      entry("2026-07-27T07:30:00.000Z", "Oats"),
    ]);

    const result = await copyDayMealsAction(
      { dayKey: "2026-07-27" },
      { ...copyDeps, now: () => new Date("2026-07-28T20:00:00.000Z") },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.drafts[0].origin).toBe("manual");
    expect(result.data.drafts[0].nutrition.energyKcal).toBe(200);
    expect(result.data.message).toContain("for review");
  });

  it("says so plainly when that day has no meals", async () => {
    const result = await copyDayMealsAction(
      { dayKey: "2026-07-27" },
      { ...copyDeps, now: () => new Date("2026-07-28T20:00:00.000Z") },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.drafts).toEqual([]);
    expect(result.data.message).toContain("nothing to copy");
  });

  it("refuses today and future days — there is nothing finished to copy", async () => {
    const now = () => new Date("2026-07-28T20:00:00.000Z");
    const today = await copyDayMealsAction(
      { dayKey: "2026-07-28" },
      { ...copyDeps, now },
    );
    const future = await copyDayMealsAction(
      { dayKey: "2026-07-30" },
      { ...copyDeps, now },
    );

    expect(today.ok).toBe(false);
    expect(future.ok).toBe(false);
    expect(listFoodEntryDraftsForRange).not.toHaveBeenCalled();
  });

  it("rejects a malformed day key", async () => {
    const result = await copyDayMealsAction({ dayKey: "yesterday" }, copyDeps);

    expect(result.ok).toBe(false);
    expect(listFoodEntryDraftsForRange).not.toHaveBeenCalled();
  });

  it("requires sign-in", async () => {
    const result = await copyDayMealsAction(
      { dayKey: "2026-07-27" },
      {
        ...copyDeps,
        requireSession: async () => {
          throw new Error("no session");
        },
      },
    );

    expect(result.ok).toBe(false);
    expect(listFoodEntryDraftsForRange).not.toHaveBeenCalled();
  });

  it("looks up each distinct catalog food once, not once per entry", async () => {
    listFoodEntryDraftsForRange.mockResolvedValueOnce([
      { ...entry("2026-07-27T07:30:00.000Z", "Oats"), foodSlug: "oats" },
      { ...entry("2026-07-27T10:30:00.000Z", "Oats again"), foodSlug: "oats" },
    ]);
    findFoodBySlugOrAlias.mockResolvedValue({
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

    const result = await copyDayMealsAction(
      { dayKey: "2026-07-27" },
      { ...copyDeps, now: () => new Date("2026-07-28T20:00:00.000Z") },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(findFoodBySlugOrAlias).toHaveBeenCalledTimes(1);
    expect(result.data.drafts[0].catalog?.defaultServingG).toBe(100);
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
