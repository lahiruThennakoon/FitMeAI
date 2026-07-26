import type { NutritionMacros } from "@/lib/domain/nutrition/types";

export type CachedFood = {
  slug: string;
  name: string;
  aliases: string[];
  defaultServingG: number;
  nutrition: NutritionMacros;
  dataSource: "database";
};

/** Queued offline write — reconciled with clientKey (AD-12). */
export type OfflineQueueItem = {
  clientKey: string;
  kind: "instant_food";
  foodSlug: string;
  quantity: number;
  unit: string;
  mealType: string;
  loggedAt: string;
  queuedAt: string;
};

/** Queued smart-parse prompt to resume online (Story 4.2). */
export type OfflineParseQueueItem = {
  clientKey: string;
  kind: "smart_parse";
  text: string;
  queuedAt: string;
};

export type OfflineCatalogPayload = {
  foods: CachedFood[];
  recentSlugs: string[];
  cachedAt: string;
};
