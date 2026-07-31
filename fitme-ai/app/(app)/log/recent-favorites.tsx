"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  loadFoodTemplateDraftAction,
  relogFoodTemplateAction,
  setFavoriteFoodAction,
} from "@/app/actions/food-template";
import type { FoodTemplateDto } from "@/lib/dal/food-template";
import { foodTemplateChipToDraft } from "@/lib/domain/nutrition/food-template-draft";
import type { ParsedFoodItemDraft } from "@/lib/domain/nutrition/parse-types";
import {
  appendWriteQueue,
  isBrowserOffline,
} from "@/lib/offline/browser-store";
import { newClientKey } from "@/lib/offline/food-cache";
import { useLogToast } from "@/components/log-toast-provider";

const OFFLINE_INSTANT_UNITS = new Set([
  "g",
  "piece",
  "serving",
  "cup",
  "bowl",
  "plate",
]);

function offlineInstantUnit(unit: string): "g" | "piece" | "serving" | "cup" | "bowl" | "plate" {
  return OFFLINE_INSTANT_UNITS.has(unit)
    ? (unit as "g" | "piece" | "serving" | "cup" | "bowl" | "plate")
    : "serving";
}

type Props = {
  recent: FoodTemplateDto[];
  favorites: FoodTemplateDto[];
  onSelectForEdit: (draft: ParsedFoodItemDraft) => void;
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
 * Recent + favorites on Log (Story 5.5).
 * Tap loads the meal into review — nothing is saved until you confirm below.
 */
export function RecentFavorites({
  recent,
  favorites,
  onSelectForEdit,
}: Props) {
  const router = useRouter();
  const { showLogToast } = useLogToast();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [favIds, setFavIds] = useState(() =>
    initialFavoriteIds(recent, favorites),
  );
  const [filter, setFilter] = useState("");

  const withFavFlag = (items: FoodTemplateDto[]) =>
    items.map((item) => ({
      ...item,
      isFavorite: favIds.has(item.sourceEntryId),
    }));

  const displayFavorites = withFavFlag(
    favorites.filter((f) => favIds.has(f.sourceEntryId)),
  );
  const extraFavFromRecent = withFavFlag(
    recent.filter(
      (r) =>
        favIds.has(r.sourceEntryId) &&
        !favorites.some((f) => f.sourceEntryId === r.sourceEntryId),
    ),
  );
  const allFavorites = [...displayFavorites, ...extraFavFromRecent];
  const allRecent = withFavFlag(recent);

  const query = filter.trim().toLowerCase();
  const match = useMemo(
    () => (items: FoodTemplateDto[]) =>
      query
        ? items.filter((item) => item.name.toLowerCase().includes(query))
        : items,
    [query],
  );
  const favoriteChips = match(allFavorites);
  const recentChips = match(allRecent);
  const totalChips = allFavorites.length + allRecent.length;

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

  function relogNow(item: FoodTemplateDto, source: "recent" | "favorite") {
    setMessage(null);

    if (isBrowserOffline()) {
      if (item.foodSlug && item.dataSource === "database") {
        const clientKey = newClientKey();
        const payload = {
          clientKey,
          foodSlug: item.foodSlug,
          quantity: item.quantity,
          unit: offlineInstantUnit(item.unit),
          mealType: item.mealType,
          loggedAt: new Date().toISOString(),
        };
        appendWriteQueue({
          ...payload,
          kind: "instant_food",
          queuedAt: new Date().toISOString(),
        });
        showLogToast(
          `Queued ${item.name} from ${source} for sync when you're back online.`,
        );
        return;
      }
      setMessage(
        `${item.name} needs a connection to log instantly — tap Review to stage it offline.`,
      );
      return;
    }

    startTransition(async () => {
      const result = await relogFoodTemplateAction({
        sourceEntryId: item.sourceEntryId,
      });
      if (!result.ok) {
        showLogToast({ message: result.error, variant: "error" });
        return;
      }
      const kcal = result.data.entry.energyKcal;
      showLogToast(
        kcal != null
          ? `Logged ${result.data.entry.name} (~${Math.round(kcal)} kcal).`
          : `Logged ${result.data.entry.name}.`,
      );
      router.refresh();
    });
  }

  function selectForEdit(item: FoodTemplateDto, source: "recent" | "favorite") {
    setMessage(null);

    if (isBrowserOffline()) {
      onSelectForEdit(foodTemplateChipToDraft(item));
      setMessage(
        `Loaded ${item.name} from ${source} for review (offline — calories only). Save when ready.`,
      );
      return;
    }

    startTransition(async () => {
      const result = await loadFoodTemplateDraftAction({
        sourceEntryId: item.sourceEntryId,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      onSelectForEdit(result.data);
      setMessage(
        `Review ${result.data.name} below — edit if you like, then save to log.`,
      );
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
          Review to edit first, or log now to save the same meal immediately.
        </p>
      </div>

      {empty ? (
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
          No recent meals yet — parse a meal below or use Quick log for cached
          staples.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {/* Only worth the extra field once scanning the chips gets slow. */}
          {totalChips > 8 ? (
            <div>
              <label htmlFor="template-filter" className="sr-only">
                Filter saved meals
              </label>
              <input
                id="template-filter"
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter saved meals"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950"
              />
            </div>
          ) : null}
          {query && favoriteChips.length === 0 && recentChips.length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Nothing saved matches “{filter.trim()}”. Parse it below to log it
              for the first time.
            </p>
          ) : null}
          {favoriteChips.length > 0 ? (
            <ChipGroup
              label="Favorites"
              source="favorite"
              items={favoriteChips}
              pending={pending}
              onSelect={selectForEdit}
              onRelogNow={relogNow}
              onToggleFavorite={toggleFavorite}
            />
          ) : null}
          {recentChips.length > 0 ? (
            <ChipGroup
              label="Recent"
              source="recent"
              items={recentChips}
              pending={pending}
              onSelect={selectForEdit}
              onRelogNow={relogNow}
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
  onSelect,
  onRelogNow,
  onToggleFavorite,
}: {
  label: string;
  source: "recent" | "favorite";
  items: FoodTemplateDto[];
  pending: boolean;
  onSelect: (item: FoodTemplateDto, source: "recent" | "favorite") => void;
  onRelogNow: (item: FoodTemplateDto, source: "recent" | "favorite") => void;
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
              onClick={() => onSelect(item, source)}
              className="px-3 py-1.5 text-left text-sm font-medium text-neutral-800 transition hover:bg-brand-blue/5 hover:text-brand-blue disabled:opacity-50 dark:text-neutral-100 dark:hover:bg-brand-blue/10"
              aria-label={`Review ${item.name} from ${source}`}
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
              onClick={() => onRelogNow(item, source)}
              className="border-l border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-brand-blue transition hover:bg-brand-blue/5 disabled:opacity-50 dark:border-neutral-600 dark:text-blue-300 dark:hover:bg-brand-blue/10"
              aria-label={`Log ${item.name} now`}
            >
              Log
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
