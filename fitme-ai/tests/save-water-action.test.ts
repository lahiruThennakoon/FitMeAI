import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveWaterEntryAction } from "@/app/actions/water";

const createEntry = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  createEntry.mockResolvedValue({
    id: "w1",
    amountMl: 250,
    loggedAt: new Date().toISOString(),
  });
});

describe("saveWaterEntryAction (Story 5.1 / FR-15)", () => {
  it("saves a quick-add amount", async () => {
    const result = await saveWaterEntryAction(
      { amountMl: 250 },
      {
        requireSession: async () =>
          ({ id: "u1", email: "a@b.com", name: null }) as never,
        createWaterEntry: createEntry,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.entry.amountMl).toBe(250);
    }
    expect(createEntry).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", amountMl: 250 }),
    );
  });

  it("requires sign-in", async () => {
    const result = await saveWaterEntryAction(
      { amountMl: 250 },
      {
        requireSession: async () => {
          throw new Error("no session");
        },
        createWaterEntry: createEntry,
      },
    );

    expect(result.ok).toBe(false);
    expect(createEntry).not.toHaveBeenCalled();
  });

  it("rejects a zero amount", async () => {
    const result = await saveWaterEntryAction(
      { amountMl: 0 },
      {
        requireSession: async () =>
          ({ id: "u1", email: "a@b.com", name: null }) as never,
        createWaterEntry: createEntry,
      },
    );

    expect(result.ok).toBe(false);
    expect(createEntry).not.toHaveBeenCalled();
  });

  it("rejects an amount above the single-log cap", async () => {
    const result = await saveWaterEntryAction(
      { amountMl: 10_000 },
      {
        requireSession: async () =>
          ({ id: "u1", email: "a@b.com", name: null }) as never,
        createWaterEntry: createEntry,
      },
    );

    expect(result.ok).toBe(false);
    expect(createEntry).not.toHaveBeenCalled();
  });
});
