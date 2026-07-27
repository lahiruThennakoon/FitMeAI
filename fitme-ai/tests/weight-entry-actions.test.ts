import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveWeightEntryAction } from "@/app/actions/weight";

const createEntry = vi.fn();

const session = async () =>
  ({ id: "u1", email: "a@b.com", name: null }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  createEntry.mockResolvedValue({
    id: "w1",
    weightG: 70_000,
    recordedAt: new Date().toISOString(),
    note: null,
  });
});

describe("saveWeightEntryAction (Story 6.1)", () => {
  it("saves a valid weigh-in", async () => {
    const result = await saveWeightEntryAction(
      { weightG: 70_000 },
      { requireSession: session, createWeightEntry: createEntry },
    );

    expect(result.ok).toBe(true);
    expect(createEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        weightG: 70_000,
      }),
    );
  });

  it("requires sign-in", async () => {
    const result = await saveWeightEntryAction(
      { weightG: 70_000 },
      {
        requireSession: async () => {
          throw new Error("no session");
        },
        createWeightEntry: createEntry,
      },
    );

    expect(result.ok).toBe(false);
    expect(createEntry).not.toHaveBeenCalled();
  });

  it("rejects out-of-range weight", async () => {
    const result = await saveWeightEntryAction(
      { weightG: 1000 },
      { requireSession: session, createWeightEntry: createEntry },
    );

    expect(result.ok).toBe(false);
    expect(createEntry).not.toHaveBeenCalled();
  });
});
