"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteGlucoseEntryAction,
  restoreGlucoseEntryAction,
  updateGlucoseEntryAction,
} from "@/app/actions/glucose";
import { UndoNotice } from "@/components/undo-notice";
import type { GlucoseEntryDto } from "@/lib/dal/glucose-entry";
import type { GlucoseContext } from "@prisma/client";
import {
  formatGlucoseContext,
  formatGlucoseValue,
} from "@/lib/domain/glucose/format";
import {
  GLUCOSE_FUTURE_MESSAGE,
  GLUCOSE_RANGE_MESSAGE,
  displayFromMgDl,
  isFutureMeasurement,
  isGlucoseInRange,
  mgDlFromDisplay,
  type GlucoseDisplayUnit,
} from "@/lib/domain/glucose/units";
import { DatetimeLocalField } from "@/components/datetime-local-field";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/domain/datetime-local";

type Props = {
  entries: GlucoseEntryDto[];
  displayUnit: GlucoseDisplayUnit;
};

const CONTEXT_OPTIONS: GlucoseContext[] = [
  "fasting",
  "before_meal",
  "after_meal",
  "bedtime",
  "other",
];

export function GlucoseList({ entries, displayUnit }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removedId, setRemovedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteGlucoseEntryAction({ id });
      if (!result.ok) {
        setError(result.error);
        setConfirmingId(null);
        return;
      }
      setConfirmingId(null);
      setRemovedId(id);
      router.refresh();
    });
  }

  function onRestore(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await restoreGlucoseEntryAction({ id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRemovedId(null);
      router.refresh();
    });
  }

  const undoNotice = removedId ? (
    <div className="mt-2">
      <UndoNotice
        message="Reading removed."
        onUndo={() => onRestore(removedId)}
        disabled={pending}
      />
    </div>
  ) : null;

  if (entries.length === 0) {
    return (
      <>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          No readings yet — log one above when you have a measurement.
        </p>
        {undoNotice}
      </>
    );
  }

  return (
    <>
      <ul className="divide-y divide-neutral-200/80 dark:divide-neutral-700/80">
        {entries.map((entry) =>
          editingId === entry.id ? (
            <GlucoseEditRow
              key={entry.id}
              entry={entry}
              displayUnit={displayUnit}
              pending={pending}
              onCancel={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                router.refresh();
              }}
              onError={setError}
            />
          ) : (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {formatGlucoseValue(entry.valueMgDl, displayUnit)}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {formatGlucoseContext(entry.context)} ·{" "}
                  {new Date(entry.measuredAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                {entry.note ? (
                  <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                    {entry.note}
                  </p>
                ) : null}
              </div>
              {confirmingId === entry.id ? (
                <div
                  className="flex shrink-0 flex-col items-end gap-1"
                  data-testid="glucose-row-confirm-delete"
                >
                  <span className="text-xs text-red-900 dark:text-red-100">
                    Remove this reading?
                  </span>
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setConfirmingId(null)}
                      className="text-xs font-medium text-neutral-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-neutral-300"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onDelete(entry.id)}
                      className="rounded-lg bg-red-600 px-2 py-0.5 text-xs font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {pending ? "Removing…" : "Remove"}
                    </button>
                  </span>
                </div>
              ) : (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setEditingId(entry.id)}
                    className="text-xs font-medium text-brand-blue underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirmingId(entry.id)}
                    className="text-xs font-medium text-neutral-500 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          ),
        )}
      </ul>
      {undoNotice}
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

function GlucoseEditRow({
  entry,
  displayUnit,
  pending,
  onCancel,
  onSaved,
  onError,
}: {
  entry: GlucoseEntryDto;
  displayUnit: GlucoseDisplayUnit;
  pending: boolean;
  onCancel: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [unit, setUnit] = useState<GlucoseDisplayUnit>(displayUnit);
  const [value, setValue] = useState(() =>
    formatDisplayInput(entry.valueMgDl, displayUnit),
  );
  const [context, setContext] = useState(entry.context);
  const [measuredAt, setMeasuredAt] = useState(() =>
    toDatetimeLocalValue(entry.measuredAt),
  );
  const [note, setNote] = useState(entry.note ?? "");
  const [, startTransition] = useTransition();

  function onUnitChange(next: GlucoseDisplayUnit) {
    const currentMgDl = Number(value);
    const mgDl = Number.isFinite(currentMgDl)
      ? mgDlFromDisplay(currentMgDl, unit)
      : entry.valueMgDl;
    setUnit(next);
    setValue(formatDisplayInput(mgDl, next));
  }

  function onSave() {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) {
      onError("Enter a positive reading.");
      return;
    }
    if (!isGlucoseInRange(num, unit)) {
      onError(GLUCOSE_RANGE_MESSAGE);
      return;
    }
    const measured = fromDatetimeLocalValue(measuredAt);
    if (Number.isNaN(measured.getTime())) {
      onError("Pick a valid date and time.");
      return;
    }
    if (isFutureMeasurement(measured)) {
      onError(GLUCOSE_FUTURE_MESSAGE);
      return;
    }
    startTransition(async () => {
      const result = await updateGlucoseEntryAction({
        id: entry.id,
        value: num,
        unit,
        context,
        measuredAt: measured.toISOString(),
        note: note.trim() || null,
      });
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          step={unit === "mmol_l" ? 0.1 : 1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-950"
        />
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value as GlucoseDisplayUnit)}
          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-950"
        >
          <option value="mg_dl">mg/dL</option>
          <option value="mmol_l">mmol/L</option>
        </select>
        <select
          value={context}
          onChange={(e) => setContext(e.target.value as GlucoseContext)}
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-950"
        >
          {CONTEXT_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {formatGlucoseContext(c)}
            </option>
          ))}
        </select>
      </div>
      <DatetimeLocalField
        id={`glucose-measured-at-${entry.id}`}
        label="When measured"
        hideLabel
        compact
        max={toDatetimeLocalValue(new Date())}
        value={measuredAt}
        onChange={setMeasuredAt}
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note"
        className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-950"
      />
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="text-xs font-medium text-brand-blue underline-offset-2 hover:underline"
        >
          Save
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="text-xs font-medium text-neutral-500 underline-offset-2 hover:underline"
        >
          Cancel
        </button>
      </div>
    </li>
  );
}

function formatDisplayInput(valueMgDl: number, unit: GlucoseDisplayUnit): string {
  const v = displayFromMgDl(valueMgDl, unit);
  return unit === "mmol_l" ? v.toFixed(1) : String(Math.round(v));
}
