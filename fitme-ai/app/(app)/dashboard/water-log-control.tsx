"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveWaterEntryAction } from "@/app/actions/water";
import {
  displayWater,
  parseWaterToMl,
  type PreferredUnits,
} from "@/lib/domain/targets/units";

/** Canonical ml amounts behind the quick-add buttons — storage stays ml (AD-11). */
const QUICK_AMOUNTS_ML = [250, 500];

type Props = {
  preferredUnits: PreferredUnits;
};

/**
 * Quick water logging control (Story 5.1 / FR-15). Calm copy — logging
 * water is never a pass/fail moment. Preferred units affect display/entry
 * only; the amount saved to the server is always converted to canonical ml.
 */
export function WaterLogControl({ preferredUnits }: Props) {
  const router = useRouter();
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const unit = preferredUnits === "imperial" ? "fl oz" : "ml";

  function logAmountMl(amountMl: number, displayLabel: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveWaterEntryAction({ amountMl });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(`Logged ${displayLabel}.`);
      setCustomAmount("");
      router.refresh();
    });
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const enteredAmount = Number(customAmount);
    if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) {
      setMessage("Enter an amount greater than zero.");
      return;
    }
    const amountMl = parseWaterToMl(enteredAmount, preferredUnits);
    logAmountMl(amountMl, `${Math.round(enteredAmount)} ${unit} of water`);
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
            Custom water amount in {unit}
          </label>
          <input
            id="custom-water-amount"
            type="number"
            inputMode="numeric"
            min={1}
            max={preferredUnits === "imperial" ? 169 : 5000}
            placeholder={`Custom ${unit}`}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            disabled={pending}
            className="w-24 rounded-xl border border-sky-300/70 bg-white/80 px-2.5 py-1.5 text-sm text-sky-900 shadow-sm focus:border-sky-400 focus:outline-none disabled:opacity-50 dark:border-sky-700/70 dark:bg-sky-950/40 dark:text-sky-100"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>

      {message ? (
        <p
          className="text-[11px] leading-snug text-sky-800/90 dark:text-sky-200/90"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
