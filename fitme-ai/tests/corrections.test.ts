import { describe, it, expect } from "vitest";
import {
  diffAiCorrections,
  snapshotFromDraft,
} from "@/lib/domain/nutrition/corrections";
import type { ParsedFoodItemDraft } from "@/lib/domain/nutrition/parse-types";

function aiDraft(
  overrides: Partial<ParsedFoodItemDraft> = {},
): ParsedFoodItemDraft {
  const base: ParsedFoodItemDraft = {
    id: "d1",
    name: "Egg",
    quantity: 2,
    unit: "piece",
    mealType: "breakfast",
    loggedAt: "2026-07-26T08:00:00.000Z",
    dataSource: "database",
    confidence: 0.9,
    needsClarification: false,
    nutrition: {
      energyKcal: 144,
      proteinG: 12.6,
      carbsG: 0.8,
      fatG: 9.6,
      fibreG: 0,
      sugarG: 0.4,
      sodiumMg: 142,
    },
    foodSlug: "egg",
    catalog: null,
    breakdown: null,
    kind: "simple",
    origin: "ai_parse",
    aiSnapshot: null,
    ...overrides,
  };
  if (base.origin === "ai_parse" && base.aiSnapshot === null) {
    base.aiSnapshot = snapshotFromDraft(base);
  }
  return base;
}

describe("diffAiCorrections (FR-20)", () => {
  it("returns empty when nothing changed", () => {
    expect(diffAiCorrections(aiDraft())).toEqual([]);
  });

  it("records before/after for name, quantity, and macros", () => {
    const item = aiDraft({
      name: "Boiled egg",
      quantity: 1,
      nutrition: {
        energyKcal: 72,
        proteinG: 6.3,
        carbsG: 0.4,
        fatG: 4.8,
        fibreG: 0,
        sugarG: 0.2,
        sodiumMg: 71,
      },
    });
    // Snapshot stays at original AI values
    item.aiSnapshot = snapshotFromDraft(
      aiDraft({ name: "Egg", quantity: 2 }),
    );

    const diffs = diffAiCorrections(item);
    const fields = diffs.map((d) => d.field);
    expect(fields).toContain("name");
    expect(fields).toContain("quantity");
    expect(fields).toContain("energyKcal");
    expect(diffs.find((d) => d.field === "name")).toMatchObject({
      beforeValue: "Egg",
      afterValue: "Boiled egg",
    });
  });

  it("skips manual-origin drafts", () => {
    const item = aiDraft({ origin: "manual", aiSnapshot: null });
    expect(diffAiCorrections(item)).toEqual([]);
  });
});
