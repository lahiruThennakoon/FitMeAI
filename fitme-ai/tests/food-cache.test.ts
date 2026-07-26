import { describe, it, expect } from "vitest";
import {
  enqueueWrite,
  mergeCatalogFoods,
  sortCachedFoods,
} from "@/lib/offline/food-cache";
import type { CachedFood, OfflineQueueItem } from "@/lib/offline/types";

const egg: CachedFood = {
  slug: "egg",
  name: "Egg",
  aliases: [],
  defaultServingG: 50,
  nutrition: {
    energyKcal: 72,
    proteinG: 6,
    carbsG: 0,
    fatG: 5,
    fibreG: 0,
    sugarG: 0,
    sodiumMg: 70,
  },
  dataSource: "database",
};

const rice: CachedFood = {
  ...egg,
  slug: "rice",
  name: "Rice",
  nutrition: { ...egg.nutrition, energyKcal: 200 },
};

describe("offline food cache (FR-16)", () => {
  it("merges catalog by slug", () => {
    const merged = mergeCatalogFoods([egg], [
      { ...egg, name: "Egg (updated)" },
      rice,
    ]);
    expect(merged).toHaveLength(2);
    expect(merged.find((f) => f.slug === "egg")?.name).toBe("Egg (updated)");
  });

  it("sorts recent foods first", () => {
    const sorted = sortCachedFoods([egg, rice], ["rice"]);
    expect(sorted[0].slug).toBe("rice");
  });

  it("dedupes write queue by clientKey", () => {
    const item: OfflineQueueItem = {
      clientKey: "abc-12345678",
      kind: "instant_food",
      foodSlug: "egg",
      quantity: 1,
      unit: "piece",
      mealType: "breakfast",
      loggedAt: "2026-07-26T08:00:00.000Z",
      queuedAt: "2026-07-26T08:00:00.000Z",
    };
    const q = enqueueWrite([item], { ...item, quantity: 2 });
    expect(q).toHaveLength(1);
    expect(q[0].quantity).toBe(2);
  });
});
