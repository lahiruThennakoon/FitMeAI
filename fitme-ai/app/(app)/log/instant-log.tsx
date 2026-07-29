"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveInstantFoodAction } from "@/app/actions/offline";
import {
  appendWriteQueue,
  isBrowserOffline,
  listCachedFoods,
  loadOfflineCatalog,
  saveOfflineCatalog,
} from "@/lib/offline/browser-store";
import { newClientKey, sortCachedFoods } from "@/lib/offline/food-cache";
import type { CachedFood } from "@/lib/offline/types";
import {
  MEAL_TYPE_OPTIONS,
  mealTypeLabel,
} from "@/lib/domain/nutrition/food-options";
import type { MealType } from "@/lib/domain/nutrition/parse-types";

/** Servings per tap; a blank or nonsense box still logs one serving. */
function servingsFrom(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function portionSummary(servings: number, mealType: MealType): string {
  const amount = `${servings} ${servings === 1 ? "serving" : "servings"}`;
  return mealType === "unknown"
    ? amount
    : `${amount} · ${mealTypeLabel(mealType)}`;
}

/** One-time synchronous read of the local cache — feeds lazy state initializers below. */
function readInitialCache(): {
  foods: CachedFood[];
  message: string | null;
} {
  const cached = loadOfflineCatalog();
  if (cached) {
    return {
      foods: sortCachedFoods(cached.foods, cached.recentSlugs),
      message: null,
    };
  }
  return {
    foods: [],
    message: isBrowserOffline()
      ? "You're offline and no foods are cached yet. Connect once to download the catalog."
      : null,
  };
}

/**
 * Instant-path logging from cached catalog foods (Story 4.1 / FR-16).
 * Works offline; queues writes for reconcile when needed.
 */
export function InstantLog() {
  const router = useRouter();
  /** Lazy initializers read cache/connectivity once on mount — no setState-in-effect. */
  const [initialCache] = useState(readInitialCache);
  const [foods, setFoods] = useState<CachedFood[]>(initialCache.foods);
  const [online, setOnline] = useState(() => !isBrowserOffline());
  const [message, setMessage] = useState<string | null>(initialCache.message);
  const [pending, startTransition] = useTransition();
  const [servingsRaw, setServingsRaw] = useState("1");
  const [mealType, setMealType] = useState<MealType>("unknown");
  const servings = servingsFrom(servingsRaw);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    if (!isBrowserOffline()) {
      void fetch("/api/offline/catalog")
        .then((r) => (r.ok ? r.json() : null))
        .then((payload) => {
          if (!payload?.foods) return;
          saveOfflineCatalog(payload);
          setFoods(sortCachedFoods(payload.foods, payload.recentSlugs ?? []));
        })
        .catch(() => {
          // Keep local cache on fetch failure.
        });
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  function logFood(food: CachedFood) {
    setMessage(null);
    const clientKey = newClientKey();
    const payload = {
      clientKey,
      foodSlug: food.slug,
      quantity: servings,
      unit: "serving" as const,
      mealType,
      loggedAt: new Date().toISOString(),
    };
    const portion = portionSummary(servings, mealType);

    startTransition(async () => {
      if (isBrowserOffline()) {
        appendWriteQueue({
          ...payload,
          kind: "instant_food",
          queuedAt: new Date().toISOString(),
        });
        setMessage(
          `Queued ${food.name} (${portion}) for sync when you're back online (no AI needed).`,
        );
        return;
      }
      try {
        const result = await saveInstantFoodAction(payload);
        if (!result.ok) {
          setMessage(result.error);
          return;
        }
        setMessage(
          result.data.created
            ? `Logged ${result.data.name} — ${portion}.`
            : `${result.data.name} was already saved.`,
        );
        router.refresh();
      } catch {
        appendWriteQueue({
          ...payload,
          kind: "instant_food",
          queuedAt: new Date().toISOString(),
        });
        setMessage(
          `Saved ${food.name} (${portion}) offline — will sync when connected.`,
        );
      }
    });
  }

  const display = foods.length > 0 ? foods : listCachedFoods();

  return (
    <section
      className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
      aria-label="Instant food log"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <span aria-hidden="true">⚡</span> Quick log
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            Tap a cached food — works offline, no AI. Taps log{" "}
            {portionSummary(servings, mealType)}.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            online
              ? "bg-brand-green/15 text-emerald-800 dark:text-emerald-200"
              : "bg-amber-500/15 text-amber-900 dark:text-amber-100"
          }`}
        >
          {online ? "Online" : "Offline"}
        </span>
      </div>

      {display.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
          No cached foods yet. Open this page online once to download staples.
        </p>
      ) : (
        <>
          {/* Portion applies to the next tap, and the chips show the scaled
              calories so the setting can't quietly go stale. */}
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label
                htmlFor="instant-servings"
                className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Servings
              </label>
              <input
                id="instant-servings"
                type="number"
                inputMode="decimal"
                min={0.25}
                step="0.25"
                value={servingsRaw}
                disabled={pending}
                onChange={(e) => setServingsRaw(e.target.value)}
                className="mt-1 w-20 rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              />
            </div>
            <div>
              <label
                htmlFor="instant-meal-type"
                className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Meal
              </label>
              <select
                id="instant-meal-type"
                value={mealType}
                disabled={pending}
                onChange={(e) => setMealType(e.target.value as MealType)}
                className="mt-1 rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              >
                {MEAL_TYPE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {display.slice(0, 12).map((food) => (
              <li key={food.slug}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => logFood(food)}
                  aria-label={`Log ${food.name}, ${portionSummary(servings, mealType)}`}
                  className="action-chip px-3 py-1.5 text-sm font-medium shadow-sm disabled:opacity-50"
                >
                  {food.name}
                  {food.nutrition.energyKcal != null ? (
                    <span className="ml-1 text-xs text-neutral-500">
                      ~{Math.round(food.nutrition.energyKcal * servings)} kcal
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {message ? (
        <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-200" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
