import { describe, it, expect } from "vitest";
import { extractJsonText, parseAndValidate } from "@/lib/ai/parse";
import { purposeForLog } from "@/lib/ai/log-meta";
import { structuredEchoSchema } from "@/lib/ai/schemas/structured-echo";

describe("extractJsonText", () => {
  it("returns plain JSON objects", () => {
    expect(extractJsonText('{"ok":true,"echo":"hi"}')).toBe(
      '{"ok":true,"echo":"hi"}',
    );
  });

  it("strips markdown fences", () => {
    const raw = 'Here you go:\n```json\n{"ok":true,"echo":"x"}\n```\n';
    expect(extractJsonText(raw)).toBe('{"ok":true,"echo":"x"}');
  });

  it("returns null for empty / non-json", () => {
    expect(extractJsonText("")).toBeNull();
    expect(extractJsonText("not json at all")).toBeNull();
  });
});

describe("parseAndValidate (FR-18 fail-safe)", () => {
  const meta = { providerId: "test", model: "m" };

  it("accepts valid structured output", () => {
    const result = parseAndValidate(
      '{"ok":true,"echo":"rice"}',
      structuredEchoSchema,
      meta,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.echo).toBe("rice");
      expect(result.meta.providerId).toBe("test");
    }
  });

  it("fails safe on malformed JSON", () => {
    const result = parseAndValidate("{not-json", structuredEchoSchema, meta);
    expect(result).toEqual({
      ok: false,
      code: "validation_failed",
      error: expect.stringMatching(/retry|manually/i),
    });
  });

  it("fails safe on partial / wrong-shaped fields", () => {
    const result = parseAndValidate(
      '{"ok":true}',
      structuredEchoSchema,
      meta,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("validation_failed");
  });

  it("fails safe when literal constraints fail", () => {
    const result = parseAndValidate(
      '{"ok":false,"echo":"nope"}',
      structuredEchoSchema,
      meta,
    );
    expect(result.ok).toBe(false);
  });
});

describe("purposeForLog", () => {
  it("keeps short machine labels and strips free text", () => {
    expect(purposeForLog("food_parse")).toBe("food_parse");
    expect(purposeForLog("  Two eggs and milk tea  ")).toBe(
      "two_eggs_and_milk_tea",
    );
    expect(purposeForLog("")).toBe("unknown");
  });
});
