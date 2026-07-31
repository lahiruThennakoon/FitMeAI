/** Catalog locale for regional food shards (Story 12.1). */

export type CatalogLocale = "lk" | "us" | "in" | "eu" | "global";

export const CATALOG_LOCALES: CatalogLocale[] = [
  "lk",
  "us",
  "in",
  "eu",
  "global",
];

const LOCALE_HINTS: Record<Exclude<CatalogLocale, "global">, string> = {
  lk: "Sri Lankan (e.g. pol sambol, dhal curry, kottu, hoppers, kiribath)",
  us: "US American (e.g. oatmeal, burger, mac and cheese, burrito, pancakes)",
  in: "Indian (e.g. dosa, idli, biryani, butter chicken, samosa, chai)",
  eu: "European (e.g. pasta, pizza, croissant, fish and chips, paella)",
};

/** Score boost when search/lookup prefers a user's catalog locale. */
export const LOCALE_MATCH_SCORE_BONUS = 25;

export function catalogLocaleHint(locale: CatalogLocale): string {
  if (locale === "global") {
    return "international and regional foods from the user's description";
  }
  return LOCALE_HINTS[locale];
}

export function resolveCatalogLocale(input: {
  catalogLocale?: CatalogLocale | null;
  country?: string | null;
}): CatalogLocale {
  if (input.catalogLocale && input.catalogLocale !== "global") {
    return input.catalogLocale;
  }
  const fromCountry = localeFromCountry(input.country ?? "");
  if (fromCountry) return fromCountry;
  return input.catalogLocale ?? "global";
}

function localeFromCountry(country: string): CatalogLocale | null {
  const c = country.trim().toLowerCase();
  if (!c) return null;
  if (["lk", "lka", "sri lanka", "srilanka"].includes(c)) return "lk";
  if (["us", "usa", "united states", "america"].includes(c)) return "us";
  if (["in", "ind", "india"].includes(c)) return "in";
  if (
    [
      "gb",
      "uk",
      "de",
      "fr",
      "it",
      "es",
      "eu",
      "europe",
      "germany",
      "france",
      "italy",
      "spain",
      "greece",
    ].includes(c)
  ) {
    return "eu";
  }
  return null;
}

export function localeScoreBonus(
  foodLocale: CatalogLocale,
  preferred: CatalogLocale,
): number {
  if (preferred === "global" || foodLocale === "global") return 0;
  return foodLocale === preferred ? LOCALE_MATCH_SCORE_BONUS : 0;
}
