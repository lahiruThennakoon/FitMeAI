import type { NutritionDataSource } from "@/lib/domain/nutrition/types";

/** User-facing source labels (FR-10 / UX-DR3) — plain language, not tech jargon. */
export function sourceLabel(dataSource: NutritionDataSource): string {
  return dataSource === "database" ? "Known food" : "Estimated";
}

/** Confidence as a whole-number percent for badges. */
export function formatConfidencePercent(confidence: number): string {
  const pct = Math.round(Math.min(1, Math.max(0, confidence)) * 100);
  return `${pct}%`;
}

export function isEstimatedSource(dataSource: NutritionDataSource): boolean {
  return dataSource === "ai_estimated";
}

/**
 * Accessible description for a nutrition value's provenance.
 * Estimated values always include confidence (AD-3 / FR-10).
 */
export function sourceCitationText(
  dataSource: NutritionDataSource,
  confidence?: number | null,
): string {
  if (dataSource === "database") {
    return "From FitMe’s food list";
  }
  const conf =
    typeof confidence === "number"
      ? ` · ${formatConfidencePercent(confidence)} sure`
      : "";
  return `AI estimate${conf}`;
}

/** Tailwind classes for AA-friendly source badges (light + dark). */
export function sourceBadgeClassName(dataSource: NutritionDataSource): string {
  if (dataSource === "database") {
    return "bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-700/25 dark:bg-emerald-950 dark:text-emerald-100 dark:ring-emerald-400/30";
  }
  return "bg-amber-100 text-amber-950 ring-1 ring-inset ring-amber-800/30 dark:bg-amber-950 dark:text-amber-50 dark:ring-amber-300/35";
}

/**
 * Item chrome: estimated gets a warm left accent + soft wash (distinct, not loud).
 * Database stays neutral so mixed lists don't look like a warning wall.
 */
export function sourceCardClassName(dataSource: NutritionDataSource): string {
  if (dataSource === "database") {
    return "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950";
  }
  return "border-neutral-200 border-l-[3px] border-l-amber-500 bg-amber-50/40 dark:border-neutral-800 dark:border-l-amber-400 dark:bg-amber-950/20";
}
