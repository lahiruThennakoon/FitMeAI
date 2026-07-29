"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteWaterEntryAction,
  restoreWaterEntryAction,
  saveWaterEntryAction,
} from "@/app/actions/water";
import { UndoNotice } from "@/components/undo-notice";
import type { WaterEntryDto } from "@/lib/dal/water-entry";
import {
  displayWater,
  parseWaterToMl,
  type PreferredUnits,
} from "@/lib/domain/targets/units";

/** Canonical ml amounts behind the quick-add buttons — storage stays ml (AD-11). */
const QUICK_AMOUNTS_ML = [250, 500];

type Props = {
  preferredUnits: PreferredUnits;
  /** The day's existing logs, so a mis-tap can be found and removed. */
  entries: WaterEntryDto[];
  /**
   * Instant to stamp new logs with. Null means "now" — set only when the user
   * is viewing a past day, so a quick-add lands on the day they're looking at.
   */
  logAtIso: string | null;
  /** Day named in copy, e.g. "today" / "Mon, Jul 20". */
  dayLabel: string;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Quick water logging control (Story 5.1 / FR-15). Calm copy — logging
 * water is never a pass/fail moment. Preferred units affect display/entry
 * only; the amount saved to the server is always converted to canonical ml.
 */
export function WaterLogControl({
  preferredUnits,
  entries,
  logAtIso,
  dayLabel,
}: Props) {
  const router = useRouter();
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [removedId, setRemovedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const unit = preferredUnits === "imperial" ? "fl oz" : "ml";

  function logAmountMl(amountMl: number, displayLabel: string) {
    setMessage(null);
    setRemovedId(null);
    startTransition(async () => {
      const result = await saveWaterEntryAction({
        amountMl,
        loggedAt: logAtIso ?? undefined,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(`Logged ${displayLabel}.`);
      setCustomAmount("");
      router.refresh();
    });
  }

  function removeEntry(id: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteWaterEntryAction(id);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setRemovedId(id);
      router.refresh();
    });
  }

  function undoRemove(id: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await restoreWaterEntryAction(id);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setRemovedId(null);
      router.refresh();
    });
  }

  const customValue = Number(customAmount);
  const canAddCustom =
    customAmount.trim() !== "" &&
    Number.isFinite(customValue) &&
    customValue > 0;

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canAddCustom) return;
    const amountMl = parseWaterToMl(customValue, preferredUnits);
    logAmountMl(amountMl, `${Math.round(customValue)} ${unit} of water`);
  }

  return (
    <div className="mt-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {QUICK_AMOUNTS_ML.map((amountMl) => {
          const displayAmount = displayWater(amountMl, preferredUnits);
          return (
            <button
              key={amountMl}
              type="button"
              disabled={pending}
              onClick={() =>
                logAmountMl(amountMl, `${displayAmount} ${unit} of water`)
              }
              className="inline-flex items-center gap-1 rounded-xl border border-sky-300/70 bg-white/80 px-3 py-1.5 text-sm font-medium text-sky-800 shadow-sm transition hover:border-sky-400 hover:bg-sky-50 disabled:opacity-50 dark:border-sky-700/70 dark:bg-sky-950/40 dark:text-sky-100 dark:hover:bg-sky-950/60"
            >
              <span aria-hidden="true">💧</span> +{displayAmount} {unit}
            </button>
          );
        })}
        <form
          onSubmit={handleCustomSubmit}
          className="flex items-center gap-1.5"
        >
          <label htmlFor="custom-water-amount" className="sr-only">
            Other amount in {unit}
          </label>
          <input
            id="custom-water-amount"
            type="number"
            inputMode="numeric"
            min={1}
            max={preferredUnits === "imperial" ? 169 : 5000}
            placeholder="Amount"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            disabled={pending}
            className="w-24 rounded-xl border border-sky-300/70 bg-white/80 px-2.5 py-1.5 text-sm text-sky-900 shadow-sm placeholder:text-sky-700/50 focus:border-sky-400 focus:outline-none disabled:opacity-50 dark:border-sky-700/70 dark:bg-sky-950/40 dark:text-sky-100 dark:placeholder:text-sky-300/40"
          />
          <span
            className="text-xs font-medium text-sky-700/70 dark:text-sky-300/70"
            aria-hidden="true"
          >
            {unit}
          </span>
          <button
            type="submit"
            disabled={pending || !canAddCustom}
            className="rounded-xl bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
        </form>
      </div>

      {logAtIso ? (
        <p className="text-[11px] leading-snug text-sky-800/80 dark:text-sky-200/80">
          Adds land on {dayLabel}, the day you&rsquo;re viewing.
        </p>
      ) : null}

      {message ? (
        <p
          className="text-[11px] leading-snug text-sky-800/90 dark:text-sky-200/90"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {removedId ? (
        <UndoNotice
          message="Water log removed."
          onUndo={() => undoRemove(removedId)}
          disabled={pending}
        />
      ) : null}

      {entries.length > 0 ? (
        <ul
          className="soft-scroll max-h-28 space-y-1 overflow-y-auto overscroll-contain"
          aria-label={`Water logs for ${dayLabel}`}
        >
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-2 text-[11px] text-sky-900/90 dark:text-sky-100/90"
            >
              <span className="tabular-nums">
                {displayWater(entry.amountMl, preferredUnits)} {unit}
                <span className="ml-1.5 text-sky-700/70 dark:text-sky-300/70">
                  {formatTime(entry.loggedAt)}
                </span>
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => removeEntry(entry.id)}
                aria-label={`Remove ${displayWater(entry.amountMl, preferredUnits)} ${unit} logged at ${formatTime(entry.loggedAt)}`}
                className="rounded-md px-1.5 py-0.5 font-medium text-sky-700/80 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-sky-300/80 dark:hover:bg-red-950/40 dark:hover:text-red-300"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
