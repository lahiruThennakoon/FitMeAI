import { describe, it, expect, vi } from "vitest";
import {
  SAFETY_SYSTEM_INSTRUCTION,
  checkAiOutputText,
  collectUserFacingStrings,
} from "@/lib/ai/guardrails";
import { GuardedAiProvider } from "@/lib/ai/guarded-provider";
import { FakeAiProvider } from "@/lib/ai/fake";
import { structuredEchoSchema } from "@/lib/ai/schemas/structured-echo";
import { createAiProvider, resetAiProviderCache } from "@/lib/ai/config";
import { foodParseAiSchema } from "@/lib/ai/schemas/food-parse";

describe("checkAiOutputText (FR-17)", () => {
  it("allows normal food-parse JSON", () => {
    const raw = JSON.stringify({
      items: [
        {
          name: "dhal curry",
          quantity: 1,
          unit: "bowl",
          confidence: 0.8,
          estimate: { energyKcal: 250, proteinG: 12, fatG: 8, fibreG: 6 },
        },
      ],
    });
    expect(checkAiOutputText(raw).ok).toBe(true);
  });

  it("blocks diagnosis language", () => {
    const r = checkAiOutputText(
      "You have diabetes based on this meal. Eat less rice.",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("medical_advice");
  });

  it("blocks medication / supplement recommendations", () => {
    const r = checkAiOutputText(
      "I recommend you take metformin and a vitamin D supplement after lunch.",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("medical_advice");
  });

  it("blocks guilt / shaming language", () => {
    const r = checkAiOutputText(
      "You should be ashamed of that dessert. That was disgusting.",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("shaming");
  });

  it("does not false-positive on fatG / sugar macros", () => {
    expect(
      checkAiOutputText(
        '{"name":"egg","estimate":{"fatG":5,"sugarG":0,"proteinG":6}}',
      ).ok,
    ).toBe(true);
  });

  it("blocks claiming invented values are known database facts", () => {
    const r = checkAiOutputText(
      "These calories are exact USDA database values for your mystery stew.",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("false_precision");
  });
});

describe("collectUserFacingStrings", () => {
  it("pulls nested name fields", () => {
    const strings = collectUserFacingStrings({
      items: [{ name: "rice" }, { name: "pol sambol" }],
      tip: "Looks good",
    });
    expect(strings).toEqual(
      expect.arrayContaining(["rice", "pol sambol", "Looks good"]),
    );
  });
});

describe("SAFETY_SYSTEM_INSTRUCTION", () => {
  it("forbids medical advice and shaming", () => {
    expect(SAFETY_SYSTEM_INSTRUCTION.toLowerCase()).toMatch(/medical advice/);
    expect(SAFETY_SYSTEM_INSTRUCTION.toLowerCase()).toMatch(/shame|guilt|judg/);
    expect(SAFETY_SYSTEM_INSTRUCTION.toLowerCase()).toMatch(/supplement|medication/);
  });
});

describe("GuardedAiProvider", () => {
  it("passes through safe structured output", async () => {
    const inner = new FakeAiProvider(() =>
      JSON.stringify({ ok: true, echo: "two eggs" }),
    );
    const guarded = new GuardedAiProvider(inner, { maxAttempts: 2 });
    const result = await guarded.generateStructured(
      { purpose: "echo", userPrompt: "hi" },
      structuredEchoSchema,
    );
    expect(result.ok).toBe(true);
  });

  it("regenerates once then succeeds", async () => {
    let calls = 0;
    const inner = new FakeAiProvider((input) => {
      calls += 1;
      if (calls === 1) {
        return JSON.stringify({
          ok: true,
          echo: "You have diabetes; take metformin.",
        });
      }
      expect(input.systemInstruction).toMatch(/previous response was blocked/i);
      return JSON.stringify({ ok: true, echo: "two eggs" });
    });
    const guarded = new GuardedAiProvider(inner, { maxAttempts: 2 });
    const result = await guarded.generateStructured(
      { purpose: "echo", userPrompt: "eggs" },
      structuredEchoSchema,
    );
    expect(result.ok).toBe(true);
    expect(calls).toBe(2);
  });

  it("safe-fails after bounded regenerations", async () => {
    const inner = new FakeAiProvider(() =>
      JSON.stringify({
        ok: true,
        echo: "You should be ashamed. Take this supplement.",
      }),
    );
    const guarded = new GuardedAiProvider(inner, { maxAttempts: 2 });
    const result = await guarded.generateStructured(
      { purpose: "echo", userPrompt: "cake" },
      structuredEchoSchema,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("guardrail_blocked");
      expect(result.error).not.toMatch(/ashamed|supplement/i);
    }
  });

  it("blocks unsafe food names in structured parse data", async () => {
    const payload = {
      items: [
        {
          name: "rice that proves you have diabetes",
          quantity: 1,
          unit: "cup",
          confidence: 0.5,
          estimate: {
            energyKcal: 200,
            proteinG: 4,
            carbsG: 40,
            fatG: 1,
            fibreG: 1,
            sugarG: 0,
            sodiumMg: 5,
          },
        },
      ],
    };
    const inner = new FakeAiProvider(() => JSON.stringify(payload));
    const guarded = new GuardedAiProvider(inner, { maxAttempts: 1 });
    const result = await guarded.generateStructured(
      { purpose: "food_parse", userPrompt: "rice" },
      foodParseAiSchema,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("guardrail_blocked");
  });
});

describe("createAiProvider wraps guardrails", () => {
  it("returns a guarded provider id from the inner adapter", () => {
    resetAiProviderCache();
    const provider = createAiProvider({ AI_PROVIDER: "fake" });
    expect(provider.id).toBe("fake");
  });

  it("injects safety instruction on generate", async () => {
    resetAiProviderCache();
    const fetchImpl = vi.fn();
    // Use fake so we inspect via Guarded → Fake chain
    let seenSystem = "";
    const provider = new GuardedAiProvider(
      new FakeAiProvider((input) => {
        seenSystem = input.systemInstruction ?? "";
        return JSON.stringify({ ok: true, echo: "ok" });
      }),
    );
    await provider.generateStructured(
      { purpose: "echo", userPrompt: "x", systemInstruction: "Parse food." },
      structuredEchoSchema,
    );
    expect(seenSystem).toContain("Parse food.");
    expect(seenSystem.toLowerCase()).toMatch(/medical advice/);
    void fetchImpl;
  });
});
