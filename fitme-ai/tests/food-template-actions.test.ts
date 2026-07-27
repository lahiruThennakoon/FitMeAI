import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  relogFoodTemplateAction,
  setFavoriteFoodAction,
} from "@/app/actions/food-template";
import { NotFoundError, UnauthorizedError } from "@/lib/dal/guards";

const setFavorite = vi.fn();
const relog = vi.fn();

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
  relog.mockResolvedValue({
    id: "new1",
    name: "Oats",
    energyKcal: 150,
    created: true,
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

describe("relogFoodTemplateAction (Story 5.5)", () => {
  it("creates a new entry from a template", async () => {
    const result = await relogFoodTemplateAction(
      {
        sourceEntryId: "e1",
        source: "recent",
        clientKey: "client-key-1234",
      },
      { requireSession: session, relogFromFoodEntry: relog },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.source).toBe("recent");
      expect(result.data.name).toBe("Oats");
    }
    expect(relog).toHaveBeenCalledWith("u1", "e1", "client-key-1234");
  });

  it("requires sign-in", async () => {
    const result = await relogFoodTemplateAction(
      { sourceEntryId: "e1", source: "favorite" },
      {
        requireSession: async () => {
          throw new Error("no session");
        },
        relogFromFoodEntry: relog,
      },
    );

    expect(result.ok).toBe(false);
    expect(relog).not.toHaveBeenCalled();
  });
});
