import { describe, it, expect, vi, beforeEach } from "vitest";

const { create } = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    aIInteraction: { create },
  },
}));

import { recordAiInteraction } from "@/lib/dal/ai-interaction";

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue({
    id: "ai-1",
    status: "succeeded",
    providerId: "fake",
    purpose: "food_parse",
  });
});

describe("recordAiInteraction (FR-19)", () => {
  it("stores succeeded audit without prompt text", async () => {
    const row = await recordAiInteraction({
      userId: "u1",
      providerId: "fake",
      model: "fake-model",
      purpose: "food_parse",
      status: "succeeded",
      confidence: 0.8,
      requestMeta: { purpose: "food_parse", promptCharLength: 12 },
      responseSummary: { itemCount: 1, items: [] },
    });

    expect(row.id).toBe("ai-1");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "succeeded",
          requestMeta: { purpose: "food_parse", promptCharLength: 12 },
          responseSummary: { itemCount: 1, items: [] },
        }),
      }),
    );
    const payload = JSON.stringify(create.mock.calls[0][0]);
    expect(payload).not.toMatch(/userPrompt|two eggs/i);
  });

  it("stores failed AI calls with error code only", async () => {
    create.mockResolvedValue({
      id: "ai-fail",
      status: "failed",
      providerId: "openai",
      purpose: "food_parse",
    });
    await recordAiInteraction({
      userId: "u1",
      providerId: "openai",
      purpose: "food_parse",
      status: "failed",
      errorCode: "guardrail_blocked",
      requestMeta: { purpose: "food_parse", promptCharLength: 40 },
      responseSummary: null,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "failed",
          errorCode: "guardrail_blocked",
          responseSummary: undefined,
        }),
      }),
    );
  });
});
