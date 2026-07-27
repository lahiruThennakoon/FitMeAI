"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveInstantFoodAction } from "@/app/actions/offline";
import {
  relogFoodTemplateAction,
  setFavoriteFoodAction,
} from "@/app/actions/food-template";
import type { FoodTemplateDto } from "@/lib/dal/food-template";
import {
  appendWriteQueue,
  isBrowserOffline,
  loadOfflineCatalog,
} from "@/lib/offline/browser-store";
import { newClientKey } from "@/lib/offline/food-cache";

type Props = {
  recent: FoodTemplateDto[];
  favorites: FoodTemplateDto[];
};

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinejoin="round"
        d="M10 2.5l2.2 4.46 4.92.72-3.56 3.47.84 4.9L10 13.77 5.6 16.05l.84-4.9L2.88 7.68l4.92-.72L10 2.5Z"
      />
    </svg>
  );
}

function initialFavoriteIds(
  recent: FoodTemplateDto[],
  favorites: FoodTemplateDto[],
): Set<string> {
  const ids = new Set(favorites.map((f) => f.sourceEntryId));
  for (const r of recent) {
    if (r.isFavorite) ids.add(r.sourceEntryId);
  }
  return ids;
}

/**
 * Recent + favorites one-tap re-log on Log (Story 5.5).
 * Catalog items reuse the instant/offline path; others clone macros as-is.
 */
export function RecentFavorites({ recent, favorites }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [favIds, setFavIds] = useState(() =>
    initialFavoriteIds(recent, favorites),
  );

  const withFavFlag = (items: FoodTemplateDto[]) =>
    items.map((item) => ({
      ...item,
      isFavorite: favIds.has(item.sourceEntryId),
    }));

  const displayFavorites = withFavFlag(
    favorites.filter((f) => favIds.has(f.sourceEntryId)),
  );
  // Favorites pinned from recent that aren't in the favorites list prop yet
  const extraFavFromRecent = withFavFlag(
    recent.filter(
      (r) =>
        favIds.has(r.sourceEntryId) &&
        !favorites.some((f) => f.sourceEntryId === r.sourceEntryId),
    ),
  );
  const favoriteChips = [...displayFavorites, ...extraFavFromRecent];
  const recentChips = withFavFlag(recent);

  function toggleFavorite(item: FoodTemplateDto) {
    const wantFav = !favIds.has(item.sourceEntryId);
    setMessage(null);
    setFavIds((prev) => {
      const copy = new Set(prev);
      if (wantFav) copy.add(item.sourceEntryId);
      else copy.delete(item.sourceEntryId);
      return copy;
    });

    startTransition(async () => {
      const result = await setFavoriteFoodAction({
        id: item.sourceEntryId,
        isFavorite: wantFav,
      });
      if (!result.ok) {
        setFavIds((prev) => {
          const copy = new Set(prev);
          if (wantFav) copy.delete(item.sourceEntryId);
          else copy.add(item.sourceEntryId);
          return copy;
        });
        setMessage(result.error);
        return;
      }
      router.refresh();
    });
  }

  function relog(item: FoodTemplateDto, source: "recent" | "favorite") {
    setMessage(null);
    const clientKey = newClientKey();
    const offline = isBrowserOffline();
    const catalog = loadOfflineCatalog();
    const cached =
      item.foodSlug != null &&
      Boolean(catalog?.foods.some((f) => f.slug === item.foodSlug));

    startTransition(async () => {
      if (item.foodSlug) {
        if (offline) {
          if (!cached) {
            setMessage(
              "That food isn’t in your offline cache. Connect once, then try again.",
            );
            return;
          }
          appendWriteQueue({
            kind: "instant_food",
            clientKey,
            foodSlug: item.foodSlug,
            quantity: item.quantity,
            unit: item.unit,
            mealType: item.mealType,
            loggedAt: new Date().toISOString(),
            queuedAt: new Date().toISOString(),
          });
          setMessage(
            `Queued ${item.name} from ${source} — will sync when you’re online.`,
          );
          return;
        }

        const instant = await saveInstantFoodAction({
          clientKey,
          foodSlug: item.foodSlug,
          quantity: item.quantity,
          unit: item.unit,
          mealType: item.mealType,
          loggedAt: new Date().toISOString(),
        });
        if (instant.ok) {
          setMessage(`Logged ${instant.data.name} from ${source} (catalog).`);
          router.refresh();
          return;
        }
        // Catalog miss — fall through to clone path.
      }

      if (offline) {
        setMessage(
          "Re-logging estimated meals needs a connection. Try Quick log for cached foods.",
        );
        return;
      }

      const result = await relogFoodTemplateAction({
        sourceEntryId: item.sourceEntryId,
        source,
        clientKey,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(`Logged ${result.data.name} from ${source}.`);
      router.refresh();
    });
  }

  const empty = recent.length === 0 && favoriteChips.length === 0;

  return (
    <section
      className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
      aria-label="Recent and favorite meals"
      data-testid="recent-favorites"
    >
      <div>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Recent & favorites
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          One tap re-logs a meal you already saved — same numbers, no new AI
          guess.
        </p>
      </div>

      {empty ? (
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
          No recent meals yet — parse a meal below or use Quick log for cached
          staples.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {favoriteChips.length > 0 ? (
            <ChipGroup
              label="Favorites"
              source="favorite"
              items={favoriteChips}
              pending={pending}
              onRelog={relog}
              onToggleFavorite={toggleFavorite}
            />
          ) : null}
          {recentChips.length > 0 ? (
            <ChipGroup
              label="Recent"
              source="recent"
              items={recentChips}
              pending={pending}
              onRelog={relog}
              onToggleFavorite={toggleFavorite}
            />
          ) : null}
        </div>
      )}

      {message ? (
        <p
          className="mt-3 text-sm text-neutral-700 dark:text-neutral-200"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}

function ChipGroup({
  label,
  source,
  items,
  pending,
  onRelog,
  onToggleFavorite,
}: {
  label: string;
  source: "recent" | "favorite";
  items: FoodTemplateDto[];
  pending: boolean;
  onRelog: (item: FoodTemplateDto, source: "recent" | "favorite") => void;
  onToggleFavorite: (item: FoodTemplateDto) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={`${source}-${item.sourceEntryId}`}
            className="inline-flex items-stretch overflow-hidden rounded-xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-600 dark:bg-neutral-950"
          >
            <button
              type="button"
              disabled={pending}
              onClick={() => onRelog(item, source)}
              className="px-3 py-1.5 text-left text-sm font-medium text-neutral-800 transition hover:bg-brand-blue/5 hover:text-brand-blue disabled:opacity-50 dark:text-neutral-100"
              aria-label={`Re-log ${item.name} from ${source}`}
            >
              {item.name}
              {item.energyKcal != null ? (
                <span className="ml-1 text-xs text-neutral-500">
                  ~{Math.round(item.energyKcal)} kcal
                </span>
              ) : null}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => onToggleFavorite(item)}
              aria-label={
                item.isFavorite
                  ? `Remove ${item.name} from favorites`
                  : `Favorite ${item.name}`
              }
              aria-pressed={item.isFavorite}
              className={`border-l border-neutral-200 px-2 transition hover:bg-amber-50 disabled:opacity-50 dark:border-neutral-600 dark:hover:bg-amber-950/30 ${
                item.isFavorite
                  ? "text-amber-500"
                  : "text-neutral-400 dark:text-neutral-500"
              }`}
            >
              <StarIcon filled={item.isFavorite} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
