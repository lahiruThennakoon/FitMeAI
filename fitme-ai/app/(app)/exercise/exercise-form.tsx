"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveExerciseEntryAction } from "@/app/actions/exercise";
import {
  EXERCISE_ESTIMATE_LIMITATION,
  EXERCISE_INTENSITIES,
  EXERCISE_TYPES,
  estimateExerciseBurn,
  type ExerciseIntensity,
  type ExerciseType,
} from "@/lib/domain/burn/exercise-estimate";

type Props = {
  /** Profile body weight in kg when available. */
  weightKg: number | null;
};

function numOrNull(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function ExerciseForm({ weightKg }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<ExerciseType>("walking");
  const [customLabel, setCustomLabel] = useState("");
  const [durationMin, setDurationMin] = useState("30");
  const [intensity, setIntensity] = useState<ExerciseIntensity>("moderate");
  const [distanceKm, setDistanceKm] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weightKgLoad, setWeightKgLoad] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const durationNum = Number(durationMin);
  const liveEstimate = useMemo(() => {
    if (!Number.isFinite(durationNum) || durationNum <= 0) return null;
    return estimateExerciseBurn({
      type,
      intensity,
      durationMin: durationNum,
      weightKg,
    });
  }, [type, intensity, durationNum, weightKg]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSavedMsg(null);

    const distanceM = (() => {
      const km = numOrNull(distanceKm);
      return km == null ? null : Math.round(km * 1000);
    })();
    const loadG = (() => {
      const kg = numOrNull(weightKgLoad);
      return kg == null ? null : Math.round(kg * 1000);
    })();

    startTransition(async () => {
      try {
        const result = await saveExerciseEntryAction({
          type,
          customLabel: type === "custom" ? customLabel : null,
          durationMin: Number(durationMin),
          intensity,
          distanceM,
          sets: numOrNull(sets),
          reps: numOrNull(reps),
          weightG: loadG,
          notes: notes.trim() || null,
        });
        if (!result.ok) {
          setError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
          return;
        }
        setSavedMsg(
          `Saved · ~${result.data.entry.estimatedKcal} kcal burned (estimate)`,
        );
        router.refresh();
      } catch {
        setError("Could not save your workout. Please try again.");
      }
    });
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
      noValidate
    >
      <div>
        <label htmlFor="exercise-type" className="block text-sm font-medium">
          Activity type
        </label>
        <select
          id="exercise-type"
          value={type}
          onChange={(e) => setType(e.target.value as ExerciseType)}
          className={inputClass}
        >
          {EXERCISE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {type === "custom" ? (
        <div>
          <label htmlFor="custom-label" className="block text-sm font-medium">
            Custom name
          </label>
          <input
            id="custom-label"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            className={inputClass}
            maxLength={80}
            required
            aria-invalid={Boolean(fieldErrors.customLabel)}
            aria-describedby={
              fieldErrors.customLabel ? "custom-label-error" : undefined
            }
          />
          {fieldErrors.customLabel ? (
            <p id="custom-label-error" className="mt-1 text-sm text-red-600">
              {fieldErrors.customLabel}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="duration" className="block text-sm font-medium">
            Duration (minutes)
          </label>
          <input
            id="duration"
            type="number"
            inputMode="decimal"
            min={1}
            step={1}
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            className={inputClass}
            required
            aria-invalid={Boolean(fieldErrors.durationMin)}
            aria-describedby={
              fieldErrors.durationMin ? "duration-error" : undefined
            }
          />
          {fieldErrors.durationMin ? (
            <p id="duration-error" className="mt-1 text-sm text-red-600">
              {fieldErrors.durationMin}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="intensity" className="block text-sm font-medium">
            Intensity
          </label>
          <select
            id="intensity"
            value={intensity}
            onChange={(e) => setIntensity(e.target.value as ExerciseIntensity)}
            className={inputClass}
          >
            {EXERCISE_INTENSITIES.map((i) => (
              <option key={i} value={i}>
                {i.charAt(0).toUpperCase() + i.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Optional details
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="distance" className="block text-sm font-medium">
              Distance (km)
            </label>
            <input
              id="distance"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="load" className="block text-sm font-medium">
              Load (kg)
            </label>
            <input
              id="load"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.5"
              value={weightKgLoad}
              onChange={(e) => setWeightKgLoad(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="sets" className="block text-sm font-medium">
              Sets
            </label>
            <input
              id="sets"
              type="number"
              inputMode="numeric"
              min={1}
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="reps" className="block text-sm font-medium">
              Reps
            </label>
            <input
              id="reps"
              type="number"
              inputMode="numeric"
              min={1}
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
            rows={2}
            maxLength={500}
          />
        </div>
      </fieldset>

      {liveEstimate ? (
        <div
          className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/30"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
              Estimated burn
            </p>
            <p className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              ~{liveEstimate.estimatedKcal} kcal
            </p>
          </div>
          <p className="mt-1.5 font-mono text-[10px] leading-snug break-words text-neutral-500 dark:text-neutral-400">
            {liveEstimate.formula}
          </p>
          <p className="mt-1.5 text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">
            {EXERCISE_ESTIMATE_LIMITATION}
            {liveEstimate.usedDefaultWeight
              ? " Using 70 kg until you set your weight in Profile."
              : null}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {savedMsg ? (
        <p className="text-sm text-green-700 dark:text-green-300" role="status">
          {savedMsg}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={pending}
          className="brand-gradient inline-flex h-12 flex-1 items-center justify-center rounded-xl px-5 text-base font-medium text-white shadow-md shadow-brand-blue/25 transition hover:opacity-90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          {pending ? "Saving…" : "Save workout"}
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center justify-center rounded-xl px-5 text-sm font-medium text-neutral-600 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 dark:text-neutral-300 dark:ring-neutral-600 dark:hover:bg-neutral-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
