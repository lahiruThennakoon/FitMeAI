import { describe, expect, it } from "vitest";
import {
  coerceFoodParseUnit,
  foodEntryToDraft,
  foodTemplateChipToDraft,
} from "@/lib/domain/nutrition/food-template-draft";

describe("coerceFoodParseUnit", () => {
  it("keeps known units", () => {
    expect(coerceFoodParseUnit("g")).toBe("g");
    expect(coerceFoodParseUnit("Serving")).toBe("serving");
  });

  it("falls back to serving for unknown units", () => {
    expect(coerceFoodParseUnit("portion")).toBe("serving");
  });
});

describe("foodEntryToDraft", () => {
  it("maps saved macros into a review draft", () => {
    const draft = foodEntryToDraft({
      id: "e1",
      name: "Chicken curry",
      quantity: 1,
      unit: "serving",
      mealType: "lunch",
      dataSource: "ai_estimated",
      confidence: 0.9,
      energyKcal: 343,
      proteinG: 28,
      carbsG: 12,
      fatG: 18,
      fibreG: 2,
      sugarG: 4,
      sodiumMg: 400,
      foodSlug: null,
    });

    expect(draft.name).toBe("Chicken curry");
    expect(draft.nutrition.energyKcal).toBe(343);
    expect(draft.nutrition.proteinG).toBe(28);
    expect(draft.origin).toBe("manual");
    expect(draft.id).toMatch(/^template_e1_/);
  });

  it("attaches catalog metadata without overwriting saved nutrition", () => {
    const draft = foodEntryToDraft(
      {
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
      },
      {
        foodSlug: "oats",
        kind: "simple",
        catalog: {
          defaultServingG: 100,
          nutritionAtDefault: {
            energyKcal: 389,
            proteinG: 17,
            carbsG: 66,
            fatG: 7,
            fibreG: 10,
            sugarG: 1,
            sodiumMg: 2,
          },
          servings: [{ name: "serving", grams: 100 }],
        },
      },
    );

    expect(draft.foodSlug).toBe("oats");
    expect(draft.catalog?.defaultServingG).toBe(100);
    expect(draft.nutrition.energyKcal).toBe(320);
  });
});

describe("foodTemplateChipToDraft", () => {
  it("builds a minimal offline draft from chip fields", () => {
    const draft = foodTemplateChipToDraft({
      sourceEntryId: "e3",
      name: "Bread",
      quantity: 2,
      unit: "piece",
      mealType: "snack",
      energyKcal: 240,
      dataSource: "ai_estimated",
      foodSlug: null,
    });

    expect(draft.name).toBe("Bread");
    expect(draft.quantity).toBe(2);
    expect(draft.nutrition.energyKcal).toBe(240);
    expect(draft.nutrition.proteinG).toBeNull();
  });
});
