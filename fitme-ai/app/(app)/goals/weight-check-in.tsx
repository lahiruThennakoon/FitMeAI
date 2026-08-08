"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  deleteWeightEntryAction,
  restoreWeightEntryAction,
  saveWeightEntryAction,
  updateWeightEntryAction,
} from "@/app/actions/weight";
import { DatetimeLocalField } from "@/components/datetime-local-field";
import { AppButton } from "@/components/app-button";
import { useLogToast } from "@/components/log-toast-provider";
import { btnClass } from "@/lib/ui/buttons";
import type { WeightEntryDto } from "@/lib/dal/weight-entry";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/domain/datetime-local";
import {
  FUTURE_TIME_MESSAGE,
  INVALID_TIME_MESSAGE,
  isFutureInstant,
} from "@/lib/domain/log-time";
import type { PreferredUnits } from "@/lib/domain/targets/units";
import {
  displayMass,
  parseMassToG,
} from "@/lib/domain/targets/units";
import {
  evaluateWeightPacing,
  formatWeeklyChangeRate,
  shouldShowWeightPacing,
} from "@/lib/domain/weight/pacing";

type Props = {
  preferredUnits: PreferredUnits;
  currentWeightG: number;
  targetWeightG: number;
  plannedWeeklyChangeG: number;
  weeklyChangeOverridden: boolean;
  recent: WeightEntryDto[];
  /** Rendered under the history when older weigh-ins exist. */
  showMore?: ReactNode;
};

const fieldClass =
  "mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

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

/** One history row: reads as a value, opens into a correction form on request. */
function WeightHistoryRow({
  entry,
  preferredUnits,
  unitLabel,
  pending,
  onRemove,
}: {
  entry: WeightEntryDto;
  preferredUnits: PreferredUnits;
  unitLabel: string;
  pending: boolean;
  onRemove: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [weight, setWeight] = useState(() =>
    String(displayMass(entry.weightG, preferredUnits)),
  );
  const [recordedAt, setRecordedAt] = useState(() =>
    toDatetimeLocalValue(entry.recordedAt),
  );
  const [note, setNote] = useState(entry.note ?? "");

  function startEdit() {
    setWeight(String(displayMass(entry.weightG, preferredUnits)));
    setRecordedAt(toDatetimeLocalValue(entry.recordedAt));
    setNote(entry.note ?? "");
    setError(null);
    setEditing(true);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const n = Number(weight);
    if (!Number.isFinite(n)) {
      setError("Enter a valid weight.");
      return;
    }
    const at = fromDatetimeLocalValue(recordedAt);
    if (Number.isNaN(at.getTime())) {
      setError(INVALID_TIME_MESSAGE);
      return;
    }
    if (isFutureInstant(at)) {
      setError(FUTURE_TIME_MESSAGE);
      return;
    }

    startSaving(async () => {
      const result = await updateWeightEntryAction(entry.id, {
        weightG: parseMassToG(n, preferredUnits),
        recordedAt: at.toISOString(),
        note: note.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
        <form onSubmit={handleSave} className="space-y-2.5" noValidate>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`weight-value-${entry.id}`}
                className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Weight ({unitLabel})
              </label>
              <input
                id={`weight-value-${entry.id}`}
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={fieldClass}
                required
              />
            </div>
            <DatetimeLocalField
              id={`weight-at-${entry.id}`}
              label="When"
              value={recordedAt}
              onChange={setRecordedAt}
              max={toDatetimeLocalValue(new Date())}
              required
            />
          </div>
          <div>
            <label
              htmlFor={`weight-note-${entry.id}`}
              className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              Note
            </label>
            <input
              id={`weight-note-${entry.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              className={fieldClass}
            />
          </div>
          {error ? (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className={btnClass("primary", { size: "sm" })}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className={btnClass("secondary", { size: "sm", className: "px-3" })}
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 text-neutral-500 dark:text-neutral-400">
        {formatDay(entry.recordedAt)}
        {entry.note ? (
          <span className="ml-1.5 truncate text-xs text-neutral-400 dark:text-neutral-500">
            {entry.note}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
          {displayMass(entry.weightG, preferredUnits)} {unitLabel}
        </span>
        <button
          type="button"
          onClick={startEdit}
          disabled={pending}
          className="rounded-md px-1.5 py-0.5 text-xs font-medium text-brand-blue transition hover:bg-brand-blue/10 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-brand-blue/20"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          aria-label={`Remove weigh-in from ${formatDay(entry.recordedAt)}`}
          className="rounded-md px-1.5 py-0.5 text-xs font-medium text-neutral-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
        >
          Remove
        </button>
      </span>
    </li>
  );
}

/**
 * Weight check-in on Profile (Story 6.1) + pacing vs plan (Story 6.3).
 */
export function WeightCheckIn({
  preferredUnits,
  currentWeightG,
  targetWeightG,
  plannedWeeklyChangeG,
  weeklyChangeOverridden,
  recent,
  showMore,
}: Props) {
  const router = useRouter();
  const { showLogToast } = useLogToast();
  const unitLabel = preferredUnits === "imperial" ? "lb" : "kg";
  const [weight, setWeight] = useState(() =>
    String(displayMass(currentWeightG, preferredUnits)),
  );
  const [note, setNote] = useState("");
  /** Empty until touched, so a weigh-in "now" needs no interaction. */
  const [recordedAt, setRecordedAt] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pacing = useMemo(
    () =>
      evaluateWeightPacing({
        entries: recent.map((e) => ({
          weightG: e.weightG,
          recordedAt: e.recordedAt,
        })),
        plannedWeeklyChangeG,
        weeklyChangeOverridden,
        preferredUnits,
      }),
    [recent, plannedWeeklyChangeG, weeklyChangeOverridden, preferredUnits],
  );

  const showPacing = shouldShowWeightPacing({
    plannedWeeklyChangeG,
    weeklyChangeOverridden,
  });

  const deltaG = currentWeightG - targetWeightG;
  const deltaDisplay = displayMass(Math.abs(deltaG), preferredUnits);
  const atTarget = Math.abs(deltaG) < 500;
  const towardLabel = atTarget
    ? "You're right around your target weight."
    : deltaG > 0
      ? `${deltaDisplay} ${unitLabel} above your target — just information.`
      : `${deltaDisplay} ${unitLabel} below your target — just information.`;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const n = Number(weight);
    if (!Number.isFinite(n)) {
      setError("Enter a valid weight.");
      return;
    }
    const weightG = parseMassToG(n, preferredUnits);

    let recordedAtIso: string | undefined;
    if (recordedAt) {
      const at = fromDatetimeLocalValue(recordedAt);
      if (Number.isNaN(at.getTime())) {
        setError(INVALID_TIME_MESSAGE);
        return;
      }
      if (isFutureInstant(at)) {
        setError(FUTURE_TIME_MESSAGE);
        return;
      }
      recordedAtIso = at.toISOString();
    }

    startTransition(async () => {
      const result = await saveWeightEntryAction({
        weightG,
        note: note.trim() || null,
        recordedAt: recordedAtIso,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showLogToast("Weigh-in saved.");
      setNote("");
      setRecordedAt("");
      router.refresh();
    });
  }

  function removeEntry(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteWeightEntryAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showLogToast({
        message: "Weigh-in removed.",
        undo: () => {
          startTransition(async () => {
            const undoResult = await restoreWeightEntryAction(id);
            if (!undoResult.ok) {
              showLogToast({ message: undoResult.error, variant: "error" });
              return;
            }
            router.refresh();
          });
        },
      });
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

      {showPacing ? (
        <div
          className="mt-3 rounded-xl border border-neutral-200/80 bg-neutral-50/80 px-3 py-2.5 dark:border-neutral-600 dark:bg-neutral-950/40"
          data-testid="weight-pacing"
          aria-live="polite"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Pacing vs plan
          </p>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
            Plan:{" "}
            {formatWeeklyChangeRate(plannedWeeklyChangeG, preferredUnits)}
            {weeklyChangeOverridden ? " (your override)" : ""}
          </p>
          {pacing.status === "ready" ? (
            <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">
              {pacing.message}
            </p>
          ) : pacing.status === "insufficient_data" ? (
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              {pacing.message}
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
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
              className={fieldClass}
              required
            />
          </div>
          <DatetimeLocalField
            id="weight-recorded-at"
            label="When"
            value={recordedAt || toDatetimeLocalValue(new Date())}
            onChange={setRecordedAt}
            max={toDatetimeLocalValue(new Date())}
          />
        </div>
        <div>
          <label
            htmlFor="weight-note"
            className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
          >
            Note (optional)
          </label>
          <input
            id="weight-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Morning, after gym…"
            className={fieldClass}
          />
        </div>
        <AppButton type="submit" disabled={pending} block>
          {pending ? "Saving…" : "Save weigh-in"}
        </AppButton>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Backdate a missed weigh-in freely — profile weight always follows your
          most recent one.
        </p>
      </form>

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {recent.length > 0 ? (
        <>
          <ul
            className="mt-4 space-y-1.5 border-t border-neutral-200 pt-3 dark:border-neutral-700"
            aria-label="Recent weigh-ins"
          >
            {recent.map((entry) => (
              <WeightHistoryRow
                key={entry.id}
                entry={entry}
                preferredUnits={preferredUnits}
                unitLabel={unitLabel}
                pending={pending}
                onRemove={() => removeEntry(entry.id)}
              />
            ))}
          </ul>
          {showMore}
        </>
      ) : (
        <p className="mt-4 border-t border-neutral-200 pt-3 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
          No weigh-ins yet — when you&apos;re ready, log one above.
        </p>
      )}
    </section>
  );
}
