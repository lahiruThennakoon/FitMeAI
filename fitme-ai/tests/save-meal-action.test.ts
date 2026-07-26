import { describe, it, expect, vi } from "vitest";
import { saveMealDraftAction } from "@/app/actions/log";
import { snapshotFromDraft } from "@/lib/domain/nutrition/corrections";
import type { ParsedFoodItemDraft } from "@/lib/domain/nutrition/parse-types";

function sampleItem(
  overrides: Partial<ParsedFoodItemDraft> = {},
): ParsedFoodItemDraft {
  const item: ParsedFoodItemDraft = {
    id: "item-1",
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
    catalog: {
      defaultServingG: 50,
      nutritionAtDefault: {
        energyKcal: 72,
        proteinG: 6.3,
        carbsG: 0.4,
        fatG: 4.8,
        fibreG: 0,
        sugarG: 0.2,
        sodiumMg: 71,
      },
      servings: [{ name: "piece", grams: 50 }],
    },
    breakdown: null,
    kind: "simple",
    origin: "ai_parse",
    aiSnapshot: null,
    ...overrides,
  };
  if (item.origin === "ai_parse" && !item.aiSnapshot) {
    item.aiSnapshot = snapshotFromDraft(item);
  }
  return item;
}

describe("saveMealDraftAction (FR-9 / FR-20)", () => {
  it("rejects without confirmed:true (no silent save)", async () => {
    const save = vi.fn();
    const result = await saveMealDraftAction(
      { items: [sampleItem()] },
      {
        requireSession: async () => ({ id: "u1" }) as never,
        saveConfirmedFoodEntries: save,
      },
    );
    expect(result.ok).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it("rejects confirmed:false", async () => {
    const save = vi.fn();
    const result = await saveMealDraftAction(
      { confirmed: false, items: [sampleItem()] },
      {
        requireSession: async () => ({ id: "u1" }) as never,
        saveConfirmedFoodEntries: save,
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/confirm/i);
    }
    expect(save).not.toHaveBeenCalled();
  });

  it("persists after confirm and counts AI corrections", async () => {
    const item = sampleItem();
    item.aiSnapshot = snapshotFromDraft(item);
    item.name = "Boiled egg";
    item.nutrition = { ...item.nutrition, energyKcal: 150 };

    const save = vi.fn().mockResolvedValue([
      { id: "fe1", name: "Boiled egg", correctionCount: 2 },
    ]);

    const result = await saveMealDraftAction(
      { confirmed: true, items: [item] },
      {
        requireSession: async () => ({ id: "u1" }) as never,
        saveConfirmedFoodEntries: save,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.entries).toHaveLength(1);
      expect(result.data.correctionCount).toBe(2);
    }
    expect(save).toHaveBeenCalledOnce();
    const [, diffs] = save.mock.calls[0] as [
      unknown,
      Map<string, unknown[]>,
    ];
    expect(diffs.get("item-1")).toHaveLength(2);
  });

  it("requires session", async () => {
    const save = vi.fn();
    const result = await saveMealDraftAction(
      { confirmed: true, items: [sampleItem()] },
      {
        requireSession: async () => {
          throw new Error("no session");
        },
        saveConfirmedFoodEntries: save,
      },
    );
    expect(result.ok).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });
});
