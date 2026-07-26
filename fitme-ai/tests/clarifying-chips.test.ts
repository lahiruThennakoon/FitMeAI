import { describe, it, expect } from "vitest";
import {
  applyClarifyingChip,
  buildPortionChipOptions,
  CLARIFYING_CONFIDENCE_THRESHOLD,
  itemNeedsClarifyingChips,
  MAX_CHIP_OPTIONS,
  MAX_CLARIFYING_CHIP_GROUPS,
  selectClarifyingChipGroups,
} from "@/lib/domain/nutrition/clarifying-chips";
import type { ParsedFoodItemDraft } from "@/lib/domain/nutrition/parse-types";

function draft(
  overrides: Partial<ParsedFoodItemDraft> & Pick<ParsedFoodItemDraft, "id" | "name">,
): ParsedFoodItemDraft {
  return {
    quantity: 1,
    unit: "serving",
    mealType: "lunch",
    loggedAt: "2026-07-26T12:00:00.000Z",
    dataSource: "database",
    confidence: 0.9,
    needsClarification: false,
    nutrition: {
      energyKcal: 100,
      proteinG: 5,
      carbsG: 10,
      fatG: 2,
      fibreG: 1,
      sugarG: 1,
      sodiumMg: 10,
    },
    foodSlug: "rice",
    catalog: {
      defaultServingG: 150,
      nutritionAtDefault: {
        energyKcal: 195,
        proteinG: 4.1,
        carbsG: 42.3,
        fatG: 0.5,
        fibreG: 0.6,
        sugarG: 0.2,
        sodiumMg: 2,
      },
      servings: [
        { name: "small", grams: 100 },
        { name: "medium", grams: 150 },
        { name: "large", grams: 220 },
      ],
    },
    breakdown: null,
    kind: "simple",
    ...overrides,
  };
}

describe("itemNeedsClarifyingChips", () => {
  it("is false for confident items", () => {
    expect(
      itemNeedsClarifyingChips(
        draft({ id: "1", name: "Rice", confidence: 0.95 }),
      ),
    ).toBe(false);
  });

  it("is true below threshold or when flagged", () => {
    expect(
      itemNeedsClarifyingChips(
        draft({
          id: "1",
          name: "Rice",
          confidence: CLARIFYING_CONFIDENCE_THRESHOLD - 0.01,
        }),
      ),
    ).toBe(true);
    expect(
      itemNeedsClarifyingChips(
        draft({
          id: "2",
          name: "Rice",
          confidence: 0.99,
          needsClarification: true,
        }),
      ),
    ).toBe(true);
  });
});

describe("selectClarifyingChipGroups", () => {
  it("returns no groups when all items are confident", () => {
    const groups = selectClarifyingChipGroups([
      draft({ id: "a", name: "Egg", confidence: 0.9 }),
      draft({ id: "b", name: "Tea", confidence: 0.85 }),
    ]);
    expect(groups).toEqual([]);
  });

  it("caps groups per log and prefers lowest confidence", () => {
    const items = [
      draft({ id: "1", name: "A", confidence: 0.5, needsClarification: true }),
      draft({ id: "2", name: "B", confidence: 0.2, needsClarification: true }),
      draft({ id: "3", name: "C", confidence: 0.4, needsClarification: true }),
      draft({ id: "4", name: "D", confidence: 0.3, needsClarification: true }),
    ];
    const groups = selectClarifyingChipGroups(items);
    expect(groups.length).toBe(MAX_CLARIFYING_CHIP_GROUPS);
    expect(groups.map((g) => g.itemId)).toEqual(["2", "4", "3"]);
    for (const g of groups) {
      expect(g.options.length).toBeGreaterThan(0);
      expect(g.options.length).toBeLessThanOrEqual(MAX_CHIP_OPTIONS);
    }
  });
});

describe("buildPortionChipOptions / applyClarifyingChip", () => {
  it("uses small/medium/large catalog servings when present", () => {
    const options = buildPortionChipOptions(
      draft({ id: "r", name: "Rice", needsClarification: true, confidence: 0.4 }),
    );
    expect(options.map((o) => o.label)).toEqual(["Small", "Medium", "Large"]);
    expect(options[1].quantity).toBe(150);
    expect(options[1].unit).toBe("g");
  });

  it("updates nutrition immediately when a chip is applied", () => {
    const item = draft({
      id: "r",
      name: "Rice",
      quantity: 1,
      unit: "serving",
      confidence: 0.4,
      needsClarification: true,
    });
    const medium = buildPortionChipOptions(item).find(
      (o) => o.label === "Medium",
    )!;
    const next = applyClarifyingChip(item, medium);
    expect(next.needsClarification).toBe(false);
    expect(next.quantity).toBe(150);
    expect(next.unit).toBe("g");
    expect(next.nutrition.energyKcal).toBe(195);
    expect(next.confidence).toBeGreaterThanOrEqual(
      CLARIFYING_CONFIDENCE_THRESHOLD,
    );
  });

  it("scales estimated-food macros when a multiplier chip is applied", () => {
    const item = draft({
      id: "x",
      name: "Unknown curry",
      quantity: 1,
      unit: "bowl",
      confidence: 0.4,
      needsClarification: true,
      dataSource: "ai_estimated",
      foodSlug: null,
      catalog: null,
      kind: "estimated",
      nutrition: {
        energyKcal: 300,
        proteinG: 10,
        carbsG: 20,
        fatG: 15,
        fibreG: null,
        sugarG: null,
        sodiumMg: null,
      },
    });
    const large = buildPortionChipOptions(item).find((o) => o.label === "Large")!;
    const next = applyClarifyingChip(item, large);
    expect(next.quantity).toBe(1.5);
    expect(next.nutrition.energyKcal).toBe(450);
    expect(next.nutrition.fibreG).toBeNull();
    expect(next.needsClarification).toBe(false);
  });
});
