import { describe, it, expect, vi, beforeEach } from "vitest";
import { snapshotFromDraft } from "@/lib/domain/nutrition/corrections";
import type { ParsedFoodItemDraft } from "@/lib/domain/nutrition/parse-types";

const foodFindUnique = vi.fn();
const aiCreate = vi.fn();
const entryCreate = vi.fn();
const correctionCreate = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        food: { findUnique: foodFindUnique },
        aIInteraction: { create: aiCreate },
        foodEntry: { create: entryCreate },
        userCorrection: { create: correctionCreate },
      };
      return fn(tx);
    },
  },
}));

import { saveConfirmedFoodEntries } from "@/lib/dal/food-entry";
import { diffAiCorrections } from "@/lib/domain/nutrition/corrections";

function item(): ParsedFoodItemDraft {
  const draft: ParsedFoodItemDraft = {
    id: "d1",
    name: "Egg",
    quantity: 1,
    unit: "piece",
    mealType: "breakfast",
    loggedAt: "2026-07-26T08:00:00.000Z",
    dataSource: "database",
    confidence: 0.9,
    needsClarification: false,
    nutrition: {
      energyKcal: 72,
      proteinG: 6.3,
      carbsG: 0.4,
      fatG: 4.8,
      fibreG: 0,
      sugarG: 0.2,
      sodiumMg: 71,
    },
    foodSlug: "egg",
    catalog: null,
    breakdown: null,
    kind: "simple",
    origin: "ai_parse",
    aiSnapshot: null,
  };
  draft.aiSnapshot = snapshotFromDraft(draft);
  draft.name = "Large egg";
  return draft;
}

beforeEach(() => {
  vi.clearAllMocks();
  foodFindUnique.mockResolvedValue({ id: "food-1" });
  aiCreate.mockResolvedValue({ id: "ai-1" });
  entryCreate.mockResolvedValue({
    id: "fe-1",
    name: "Large egg",
  });
  correctionCreate.mockResolvedValue({ id: "c1" });
});

describe("saveConfirmedFoodEntries", () => {
  it("creates AIInteraction, FoodEntry, and UserCorrection rows", async () => {
    const draft = item();
    const diffs = new Map([[draft.id, diffAiCorrections(draft)]]);

    const saved = await saveConfirmedFoodEntries(
      { userId: "u1", items: [draft], providerId: "fake" },
      diffs,
    );

    expect(aiCreate).toHaveBeenCalledOnce();
    expect(entryCreate).toHaveBeenCalledOnce();
    expect(correctionCreate).toHaveBeenCalled();
    expect(saved[0]).toMatchObject({ id: "fe-1", correctionCount: 1 });
  });

  it("skips AIInteraction for manual drafts", async () => {
    const draft = item();
    draft.origin = "manual";
    draft.aiSnapshot = null;
    draft.dataSource = "database";
    const diffs = new Map([[draft.id, []]]);

    await saveConfirmedFoodEntries(
      { userId: "u1", items: [draft] },
      diffs,
    );

    expect(aiCreate).not.toHaveBeenCalled();
    expect(entryCreate).toHaveBeenCalledOnce();
    expect(correctionCreate).not.toHaveBeenCalled();
  });

  it("persists a trimmed note and stores a blank one as null", async () => {
    const withNote = item();
    withNote.note = "  shared with Amma  ";
    const blank = item();
    blank.id = "draft_blank";
    blank.note = "   ";

    await saveConfirmedFoodEntries(
      { userId: "u1", items: [withNote, blank], providerId: "fake" },
      new Map([
        [withNote.id, []],
        [blank.id, []],
      ]),
    );

    expect(entryCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ note: "shared with Amma" }),
      }),
    );
    expect(entryCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ note: null }) }),
    );
  });

  it("links FoodEntry to an existing parse AIInteraction (FR-19)", async () => {
    const draft = item();
    draft.dataSource = "ai_estimated";
    const diffs = new Map([[draft.id, []]]);

    await saveConfirmedFoodEntries(
      {
        userId: "u1",
        items: [draft],
        aiInteractionId: "ai-parse-99",
      },
      diffs,
    );

    expect(aiCreate).not.toHaveBeenCalled();
    expect(entryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aiInteractionId: "ai-parse-99",
          dataSource: "ai_estimated",
        }),
      }),
    );
  });

  it("does not attribute re-logged drafts to an unrelated parse", async () => {
    const parsed = item();
    const relogged = item();
    relogged.id = "draft_relog";
    relogged.origin = "manual";
    relogged.aiSnapshot = null;
    // Estimated macros carried over from the original entry still need an audit
    // row, but it must not be this parse's row.
    relogged.dataSource = "ai_estimated";
    const diffs = new Map([
      [parsed.id, []],
      [relogged.id, []],
    ]);

    await saveConfirmedFoodEntries(
      {
        userId: "u1",
        items: [parsed, relogged],
        aiInteractionId: "ai-parse-99",
      },
      diffs,
    );

    expect(aiCreate).toHaveBeenCalledOnce();
    const linkedIds = entryCreate.mock.calls.map(
      (call) => (call[0] as { data: { aiInteractionId: string | null } }).data
        .aiInteractionId,
    );
    expect(linkedIds).toEqual(["ai-parse-99", "ai-1"]);
  });
});
