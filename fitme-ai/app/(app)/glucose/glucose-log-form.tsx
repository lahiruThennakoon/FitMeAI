"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGlucoseEntryAction } from "@/app/actions/glucose";
import { DatetimeLocalField } from "@/components/datetime-local-field";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/domain/datetime-local";
import {
  GLUCOSE_FUTURE_MESSAGE,
  GLUCOSE_RANGE_MESSAGE,
  isFutureMeasurement,
  isGlucoseInRange,
  type GlucoseDisplayUnit,
} from "@/lib/domain/glucose/units";

const CONTEXT_OPTIONS = [
  { value: "fasting", label: "Fasting" },
  { value: "before_meal", label: "Before meal" },
  { value: "after_meal", label: "After meal" },
  { value: "bedtime", label: "Bedtime" },
  { value: "other", label: "Other" },
] as const;

type Props = {
  defaultUnit?: GlucoseDisplayUnit;
};

export function GlucoseLogForm({ defaultUnit = "mg_dl" }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<GlucoseDisplayUnit>(defaultUnit);
  const [context, setContext] =
    useState<(typeof CONTEXT_OPTIONS)[number]["value"]>("other");
  const [note, setNote] = useState("");
  const [measuredAt, setMeasuredAt] = useState(() =>
    toDatetimeLocalValue(new Date()),
  );

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) {
      setError("Enter a positive reading.");
      return;
    }
    if (!isGlucoseInRange(num, unit)) {
      setError(GLUCOSE_RANGE_MESSAGE);
      return;
    }
    const measured = fromDatetimeLocalValue(measuredAt);
    if (Number.isNaN(measured.getTime())) {
      setError("Pick a valid date and time.");
      return;
    }
    if (isFutureMeasurement(measured)) {
      setError(GLUCOSE_FUTURE_MESSAGE);
      return;
    }

    startTransition(async () => {
      const result = await createGlucoseEntryAction({
        value: num,
        unit,
        context,
        measuredAt: measured.toISOString(),
        note: note.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setValue("");
      setNote("");
      setMeasuredAt(toDatetimeLocalValue(new Date()));
      setMessage("Reading saved — thanks for logging it.");
      router.refresh();
    });
  }

  return (
    <section
      className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
      aria-label="Log glucose"
      data-testid="glucose-log-form"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        New reading
      </p>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
        Log your own measurement — this is not a diagnosis tool.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="glucose-value"
              className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              Value
            </label>
            <input
              id="glucose-value"
              type="number"
              inputMode="decimal"
              step={unit === "mmol_l" ? 0.1 : 1}
              min={0}
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </div>
          <div className="w-28">
            <label
              htmlFor="glucose-unit"
              className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              Unit
            </label>
            <select
              id="glucose-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as GlucoseDisplayUnit)}
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            >
              <option value="mg_dl">mg/dL</option>
              <option value="mmol_l">mmol/L</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="glucose-context"
            className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
          >
            Context
          </label>
          <select
            id="glucose-context"
            value={context}
            onChange={(e) =>
              setContext(e.target.value as typeof context)
            }
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          >
            {CONTEXT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <DatetimeLocalField
          id="glucose-measured-at"
          label="When measured"
          required
          max={toDatetimeLocalValue(new Date())}
          value={measuredAt}
          onChange={setMeasuredAt}
        />

        <div>
          <label
            htmlFor="glucose-note"
            className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
          >
            Note (optional)
          </label>
          <input
            id="glucose-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="brand-gradient inline-flex h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save reading"}
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
    </section>
  );
}
