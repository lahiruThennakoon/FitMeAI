"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchFoodCatalogAction } from "@/app/actions/catalog";
import { saveInstantFoodAction } from "@/app/actions/offline";
import { useLogToast } from "@/components/log-toast-provider";
import type { FoodSearchHit } from "@/lib/dal/nutrition";
import {
  appendWriteQueue,
  isBrowserOffline,
} from "@/lib/offline/browser-store";
import { newClientKey } from "@/lib/offline/food-cache";
import {
  MEAL_TYPE_OPTIONS,
  mealTypeLabel,
} from "@/lib/domain/nutrition/food-options";
import type { MealType } from "@/lib/domain/nutrition/parse-types";

type Props = {
  onAddToReview?: (hit: FoodSearchHit) => void;
};

function servingsFrom(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Online catalog search on Log (Tier 3).
 * Tap logs one serving instantly; "Review" loads the chip into the form below.
 */
export function FoodCatalogSearch({ onAddToReview }: Props) {
  const router = useRouter();
  const { showLogToast } = useLogToast();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FoodSearchHit[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPending, startSearchTransition] = useTransition();
  const [logPending, startLogTransition] = useTransition();
  const [servingsRaw, setServingsRaw] = useState("1");
  const [mealType, setMealType] = useState<MealType>("unknown");
  const servings = servingsFrom(servingsRaw);
  const trimmed = query.trim();
  const searchGeneration = useRef(0);

  useEffect(() => {
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    const generation = ++searchGeneration.current;
    const handle = window.setTimeout(() => {
      startSearchTransition(async () => {
        const result = await searchFoodCatalogAction({ query: trimmed });
        if (generation !== searchGeneration.current) return;
        if (!result.ok) {
          setHits([]);
          setSearchError(result.error);
          return;
        }
        setHits(result.data.hits);
        setSearchError(null);
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [trimmed]);

  function logHit(hit: FoodSearchHit) {
    const clientKey = newClientKey();
    const payload = {
      clientKey,
      foodSlug: hit.slug,
      quantity: servings,
      unit: "serving" as const,
      mealType,
      loggedAt: new Date().toISOString(),
    };
    const portion =
      mealType === "unknown"
        ? `${servings} ${servings === 1 ? "serving" : "servings"}`
        : `${servings} ${servings === 1 ? "serving" : "servings"} · ${mealTypeLabel(mealType)}`;

    startLogTransition(async () => {
      if (isBrowserOffline()) {
        appendWriteQueue({
          ...payload,
          kind: "instant_food",
          queuedAt: new Date().toISOString(),
        });
        showLogToast(
          `Queued ${hit.name} (${portion}) for sync when you're back online.`,
        );
        return;
      }
      const result = await saveInstantFoodAction(payload);
      if (!result.ok) {
        showLogToast({ message: result.error, variant: "error" });
        return;
      }
      showLogToast(
        result.data.created
          ? `Logged ${result.data.name} — ${portion}.`
          : `${result.data.name} was already saved.`,
      );
      router.refresh();
    });
  }

  return (
    <section
      className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
      aria-label="Food catalog search"
    >
      <div>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Search catalog
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          Find a staple by name — log instantly or open in review below.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="catalog-search" className="sr-only">
            Search foods
          </label>
          <input
            id="catalog-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. oats, chicken, rice"
            aria-busy={searchPending}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>
        <div>
          <label
            htmlFor="catalog-servings"
            className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
          >
            Servings
          </label>
          <input
            id="catalog-servings"
            type="number"
            inputMode="decimal"
            min={0.25}
            step="0.25"
            value={servingsRaw}
            onChange={(e) => setServingsRaw(e.target.value)}
            className="mt-1 w-20 rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>
        <div>
          <label
            htmlFor="catalog-meal-type"
            className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
          >
            Meal
          </label>
          <select
            id="catalog-meal-type"
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType)}
            className="mt-1 rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          >
            {MEAL_TYPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {trimmed.length >= 2 && hits.length === 0 && !searchPending ? (
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
          No catalog match for “{trimmed}”. Try AI parse below.
        </p>
      ) : null}

      {hits.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {hits.map((hit) => (
            <li
              key={hit.slug}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200/80 bg-white/90 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-950"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {hit.name}
                </p>
                {hit.energyKcal != null ? (
                  <p className="text-xs text-neutral-500">
                    ~{Math.round(hit.energyKcal * servings)} kcal
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {onAddToReview ? (
                  <button
                    type="button"
                    disabled={logPending}
                    onClick={() => onAddToReview(hit)}
                    className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-900"
                  >
                    Review
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={logPending}
                  onClick={() => logHit(hit)}
                  className="rounded-lg bg-brand-blue/10 px-2.5 py-1 text-xs font-medium text-brand-blue transition hover:bg-brand-blue/15 disabled:opacity-50 dark:text-blue-300"
                >
                  Log now
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {searchError ? (
        <p
          className="mt-3 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {searchError}
        </p>
      ) : null}
    </section>
  );
}
