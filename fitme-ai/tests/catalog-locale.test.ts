import { describe, it, expect } from "vitest";
import {
  catalogLocaleHint,
  localeScoreBonus,
  resolveCatalogLocale,
} from "@/lib/domain/nutrition/catalog-locale";
import { SEED_FOODS } from "../prisma/seed/catalog";

describe("resolveCatalogLocale", () => {
  it("prefers explicit catalogLocale on profile", () => {
    expect(
      resolveCatalogLocale({ catalogLocale: "us", country: "LK" }),
    ).toBe("us");
  });

  it("derives from country when catalogLocale is global", () => {
    expect(resolveCatalogLocale({ catalogLocale: "global", country: "US" })).toBe(
      "us",
    );
    expect(resolveCatalogLocale({ country: "India" })).toBe("in");
    expect(resolveCatalogLocale({ country: "Sri Lanka" })).toBe("lk");
  });

  it("falls back to global", () => {
    expect(resolveCatalogLocale({})).toBe("global");
  });
});

describe("localeScoreBonus", () => {
  it("boosts matching locale foods in search ranking", () => {
    expect(localeScoreBonus("us", "us")).toBeGreaterThan(0);
    expect(localeScoreBonus("lk", "us")).toBe(0);
    expect(localeScoreBonus("us", "global")).toBe(0);
  });
});

describe("catalogLocaleHint", () => {
  it("includes regional examples per locale", () => {
    expect(catalogLocaleHint("us")).toMatch(/burger/i);
    expect(catalogLocaleHint("in")).toMatch(/dosa/i);
    expect(catalogLocaleHint("lk")).toMatch(/kottu/i);
  });
});

describe("multi-region seed catalog", () => {
  it("includes foods from lk, us, in, and eu shards", () => {
    const locales = new Set(SEED_FOODS.map((f) => f.locale));
    expect(locales.has("lk")).toBe(true);
    expect(locales.has("us")).toBe(true);
    expect(locales.has("in")).toBe(true);
    expect(locales.has("eu")).toBe(true);
    expect(SEED_FOODS.length).toBeGreaterThanOrEqual(90);
  });
});
