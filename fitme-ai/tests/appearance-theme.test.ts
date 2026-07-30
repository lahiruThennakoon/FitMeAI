import { describe, it, expect } from "vitest";
import {
  normalizeAppearancePreference,
  resolveEffectiveDark,
} from "@/lib/domain/appearance/types";
import { buildAppearanceInitScript } from "@/lib/appearance/init-script";

describe("appearance theme resolution", () => {
  it("respects explicit light and dark", () => {
    expect(resolveEffectiveDark("light", true)).toBe(false);
    expect(resolveEffectiveDark("dark", false)).toBe(true);
  });

  it("follows system preference when on system", () => {
    expect(resolveEffectiveDark("system", true)).toBe(true);
    expect(resolveEffectiveDark("system", false)).toBe(false);
  });

  it("normalizes unknown values to system", () => {
    expect(normalizeAppearancePreference("nope")).toBe("system");
    expect(normalizeAppearancePreference(null)).toBe("system");
  });

  it("emits a synchronous init script", () => {
    const script = buildAppearanceInitScript();
    expect(script).toContain("localStorage");
    expect(script).toContain('classList.toggle("dark"');
  });

  it("embeds profile fallback when localStorage is empty", () => {
    const script = buildAppearanceInitScript(undefined, "dark");
    expect(script).toContain('"dark"');
    expect(script).toContain("fb=");
  });
});
