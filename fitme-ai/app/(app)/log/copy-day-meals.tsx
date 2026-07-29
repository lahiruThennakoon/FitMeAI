"use client";

import { useState, useTransition } from "react";
import { copyDayMealsAction } from "@/app/actions/food-template";
import type { ParsedFoodItemDraft } from "@/lib/domain/nutrition/parse-types";
import { isBrowserOffline } from "@/lib/offline/browser-store";

type Props = {
  /** Yesterday in the user's timezone — the default and the newest copyable day. */
  yesterdayKey: string;
  /** Returns how many drafts fit in the review list. */
  onLoadDrafts: (drafts: ParsedFoodItemDraft[]) => {
    added: number;
    skipped: number;
  };
};

/**
 * Copy a finished day's meals into review (Tier 3 logging convenience).
 * Edit-first like the recent chips — each meal keeps its time of day, and
 * nothing is written until the user saves the review list below.
 */
export function CopyDayMeals({ yesterdayKey, onLoadDrafts }: Props) {
  const [dayKey, setDayKey] = useState(yesterdayKey);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function copy() {
    setMessage(null);
    setError(null);

    if (isBrowserOffline()) {
      setError(
        "Copying a past day needs a connection. Use Quick log for cached foods until you're back.",
      );
      return;
    }

    startTransition(async () => {
      const result = await copyDayMealsAction({ dayKey });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { added, skipped } = onLoadDrafts(result.data.drafts);
      setMessage(
        skipped > 0
          ? `${result.data.message} Only ${added} fit in one review — save these, then copy again for the rest.`
          : result.data.message,
      );
    });
  }

  return (
    <section
      className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
      aria-label="Copy a past day's meals"
      data-testid="copy-day-meals"
    >
      <div>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Copy a day
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          Load a finished day&rsquo;s meals into review. Each one keeps its time
          of day, and you can edit or drop any before saving.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[10rem] flex-1">
          <label
            htmlFor="copy-day"
            className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
          >
            Day to copy
          </label>
          <input
            id="copy-day"
            type="date"
            value={dayKey}
            max={yesterdayKey}
            disabled={pending}
            onChange={(e) => setDayKey(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>
        <button
          type="button"
          onClick={copy}
          disabled={pending || !dayKey}
          className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium text-brand-blue ring-1 ring-inset ring-brand-blue/30 transition hover:bg-brand-blue/5 disabled:opacity-50 dark:hover:bg-brand-blue/10"
        >
          {pending ? "Loading…" : "Load meals"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-700 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
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
