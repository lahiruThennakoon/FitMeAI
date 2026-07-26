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

/**
 * Instant-path logging from cached catalog foods (Story 4.1 / FR-16).
 * Works offline; queues writes for reconcile when needed.
 */
export function InstantLog() {
  const router = useRouter();
  const [foods, setFoods] = useState<CachedFood[]>([]);
  const [online, setOnline] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setOnline(!isBrowserOffline());
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const cached = loadOfflineCatalog();
    if (cached) {
      setFoods(sortCachedFoods(cached.foods, cached.recentSlugs));
    }

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
    } else if (!cached) {
      setMessage(
        "You're offline and no foods are cached yet. Connect once to download the catalog.",
      );
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
      quantity: 1,
      unit: "serving" as const,
      mealType: "unknown" as const,
      loggedAt: new Date().toISOString(),
    };

    startTransition(async () => {
      if (isBrowserOffline()) {
        appendWriteQueue({
          ...payload,
          kind: "instant_food",
          queuedAt: new Date().toISOString(),
        });
        setMessage(
          `Queued ${food.name} for sync when you're back online (no AI needed).`,
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
            ? `Logged ${result.data.name} from catalog.`
            : `${result.data.name} was already saved.`,
        );
        router.refresh();
      } catch {
        appendWriteQueue({
          ...payload,
          kind: "instant_food",
          queuedAt: new Date().toISOString(),
        });
        setMessage(`Saved ${food.name} offline — will sync when connected.`);
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
            Tap a cached food — works offline, no AI.
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
        <ul className="mt-3 flex flex-wrap gap-2">
          {display.slice(0, 12).map((food) => (
            <li key={food.slug}>
              <button
                type="button"
                disabled={pending}
                onClick={() => logFood(food)}
                className="rounded-xl border border-neutral-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:border-brand-blue/50 hover:text-brand-blue disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              >
                {food.name}
                {food.nutrition.energyKcal != null ? (
                  <span className="ml-1 text-xs text-neutral-500">
                    ~{Math.round(food.nutrition.energyKcal)} kcal
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {message ? (
        <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-200" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
