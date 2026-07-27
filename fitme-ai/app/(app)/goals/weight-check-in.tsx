"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveWeightEntryAction } from "@/app/actions/weight";
import type { WeightEntryDto } from "@/lib/dal/weight-entry";
import type { PreferredUnits } from "@/lib/domain/targets/units";
import {
  displayMass,
  parseMassToG,
} from "@/lib/domain/targets/units";

type Props = {
  preferredUnits: PreferredUnits;
  currentWeightG: number;
  targetWeightG: number;
  recent: WeightEntryDto[];
};

function formatDay(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * Weight check-in on Profile (Story 6.1). Calm progress — no shame framing.
 */
export function WeightCheckIn({
  preferredUnits,
  currentWeightG,
  targetWeightG,
  recent,
}: Props) {
  const router = useRouter();
  const unitLabel = preferredUnits === "imperial" ? "lb" : "kg";
  const [weight, setWeight] = useState(() =>
    String(displayMass(currentWeightG, preferredUnits)),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const deltaG = currentWeightG - targetWeightG;
  const deltaDisplay = displayMass(Math.abs(deltaG), preferredUnits);
  const atTarget = Math.abs(deltaG) < 500; // within 0.5 kg
  const towardLabel = atTarget
    ? "You're right around your target weight."
    : deltaG > 0
      ? `${deltaDisplay} ${unitLabel} above your target — just information.`
      : `${deltaDisplay} ${unitLabel} below your target — just information.`;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const n = Number(weight);
    if (!Number.isFinite(n)) {
      setError("Enter a valid weight.");
      return;
    }
    const weightG = parseMassToG(n, preferredUnits);

    startTransition(async () => {
      const result = await saveWeightEntryAction({ weightG });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Weigh-in saved — profile weight updated.");
      router.refresh();
    });
  }

  return (
    <section
      className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
      aria-label="Weight check-in"
      data-testid="weight-check-in"
    >
      <div>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Weight check-in
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          Log a weigh-in anytime. It updates your profile weight used for burn
          estimates.
        </p>
      </div>

      <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-200">
        {towardLabel}
      </p>

      <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[8rem] flex-1">
          <label
            htmlFor="weight-check-in"
            className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
          >
            Weight ({unitLabel})
          </label>
          <input
            id="weight-check-in"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={preferredUnits === "imperial" ? 44 : 20}
            max={preferredUnits === "imperial" ? 1100 : 500}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            required
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="brand-gradient inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save weigh-in"}
        </button>
      </form>

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200" role="status">
          {message}
        </p>
      ) : null}

      {recent.length > 0 ? (
        <ul
          className="mt-4 space-y-1.5 border-t border-neutral-200 pt-3 dark:border-neutral-700"
          aria-label="Recent weigh-ins"
        >
          {recent.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-neutral-500 dark:text-neutral-400">
                {formatDay(entry.recordedAt)}
              </span>
              <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                {displayMass(entry.weightG, preferredUnits)} {unitLabel}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 border-t border-neutral-200 pt-3 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
          No weigh-ins yet — when you&apos;re ready, log one above.
        </p>
      )}
    </section>
  );
}
