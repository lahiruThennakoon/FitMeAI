"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteExerciseEntryAction,
  updateExerciseEntryAction,
} from "@/app/actions/exercise";
import type { ExerciseEntryEditableDto } from "@/lib/dal/exercise-entry";
import {
  EXERCISE_INTENSITIES,
  EXERCISE_TYPES,
  estimateExerciseBurn,
  type ExerciseIntensity,
  type ExerciseType,
} from "@/lib/domain/burn/exercise-estimate";

function fmtEstimateKcal(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return `~${Math.round(v)} kcal`;
}

/** Compact stroke icons for row actions — label lives in aria-label/title. */
function PencilIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="M13.586 3.586a2 2 0 0 1 2.828 2.828l-8.25 8.25a1 1 0 0 1-.414.242l-3 0.75a.5.5 0 0 1-.606-.606l.75-3a1 1 0 0 1 .242-.414l8.25-8.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 5l3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="M4.5 6h11M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2.5 0v9a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 6.5 15V6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type EditFormState = {
  type: ExerciseType;
  customLabel: string;
  durationMin: string;
  intensity: ExerciseIntensity;
};

function toFormState(entry: ExerciseEntryEditableDto): EditFormState {
  return {
    type: entry.type as ExerciseType,
    customLabel: entry.customLabel ?? "",
    durationMin: String(entry.durationMin),
    intensity: entry.intensity as ExerciseIntensity,
  };
}

type Props = {
  entries: ExerciseEntryEditableDto[];
  /** Profile body weight in kg when available — live preview only. */
  weightKg: number | null;
};

/**
 * Today's exercise list with inline edit/soft-delete (Story 5.3).
 * Burn stays labelled as an estimate after edits.
 */
export function TodayExercisesList({ entries, weightKg }: Props) {
  if (entries.length === 0) {
    return (
      <p className="mt-4 border-t border-neutral-200 pt-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
        No workouts yet today — a short log keeps energy balance honest.
      </p>
    );
  }

  return (
    <ul
      className="soft-scroll mt-4 max-h-52 space-y-2 overflow-y-auto overscroll-contain border-t border-neutral-200 pt-4 dark:border-neutral-700"
      data-testid="today-exercises-list"
      aria-label="Today's workouts, scrollable"
    >
      {entries.map((entry) => (
        <ExerciseRow key={entry.id} entry={entry} weightKg={weightKg} />
      ))}
    </ul>
  );
}

type RowMode = "view" | "editing" | "confirmingDelete";

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

function ExerciseRow({
  entry,
  weightKg,
}: {
  entry: ExerciseEntryEditableDto;
  weightKg: number | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<RowMode>("view");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<EditFormState>(() => toFormState(entry));

  const durationNum = Number(form.durationMin);
  const liveEstimate = useMemo(() => {
    if (!Number.isFinite(durationNum) || durationNum <= 0) return null;
    return estimateExerciseBurn({
      type: form.type,
      intensity: form.intensity,
      durationMin: durationNum,
      weightKg,
    });
  }, [form.type, form.intensity, durationNum, weightKg]);

  function startEdit() {
    setForm(toFormState(entry));
    setError(null);
    setFieldErrors({});
    setMode("editing");
  }

  function cancelEdit() {
    setError(null);
    setFieldErrors({});
    setMode("view");
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await updateExerciseEntryAction(entry.id, {
        type: form.type,
        customLabel: form.type === "custom" ? form.customLabel : null,
        durationMin: Number(form.durationMin),
        intensity: form.intensity,
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setMode("view");
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await deleteExerciseEntryAction(entry.id);
      if (!result.ok) {
        setError(result.error);
        setMode("view");
        return;
      }
      router.refresh();
    });
  }

  if (mode === "confirmingDelete") {
    return (
      <li
        className="flex items-center justify-between gap-3 rounded-lg border border-red-200/80 bg-red-50/60 px-3 py-2 text-sm dark:border-red-900/50 dark:bg-red-950/20"
        data-testid="exercise-row-confirm-delete"
      >
        <span className="text-red-900 dark:text-red-100">
          Remove &ldquo;{entry.displayName}&rdquo; from today?
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => setMode("view")}
            className="rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-neutral-300"
          >
            Keep
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-2.5 py-1 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Removing…" : "Remove"}
          </button>
        </span>
      </li>
    );
  }

  if (mode === "editing") {
    return (
      <li
        className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-700 dark:bg-neutral-800/50"
        data-testid="exercise-row-editing"
      >
        <form onSubmit={handleSave} className="space-y-2.5" noValidate>
          <div>
            <label
              htmlFor={`ex-type-${entry.id}`}
              className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              Activity type
            </label>
            <select
              id={`ex-type-${entry.id}`}
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as ExerciseType })
              }
              className={inputClass}
              aria-invalid={Boolean(fieldErrors.type)}
            >
              {EXERCISE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {form.type === "custom" ? (
            <div>
              <label
                htmlFor={`ex-label-${entry.id}`}
                className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Custom name
              </label>
              <input
                id={`ex-label-${entry.id}`}
                value={form.customLabel}
                onChange={(e) =>
                  setForm({ ...form, customLabel: e.target.value })
                }
                className={inputClass}
                maxLength={80}
                required
                aria-invalid={Boolean(fieldErrors.customLabel)}
                aria-describedby={
                  fieldErrors.customLabel
                    ? `ex-label-error-${entry.id}`
                    : undefined
                }
              />
              {fieldErrors.customLabel ? (
                <p
                  id={`ex-label-error-${entry.id}`}
                  className="mt-1 text-xs text-red-600"
                >
                  {fieldErrors.customLabel}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`ex-duration-${entry.id}`}
                className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Duration (min)
              </label>
              <input
                id={`ex-duration-${entry.id}`}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={form.durationMin}
                onChange={(e) =>
                  setForm({ ...form, durationMin: e.target.value })
                }
                className={inputClass}
                required
                aria-invalid={Boolean(fieldErrors.durationMin)}
                aria-describedby={
                  fieldErrors.durationMin
                    ? `ex-duration-error-${entry.id}`
                    : undefined
                }
              />
              {fieldErrors.durationMin ? (
                <p
                  id={`ex-duration-error-${entry.id}`}
                  className="mt-1 text-xs text-red-600"
                >
                  {fieldErrors.durationMin}
                </p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor={`ex-intensity-${entry.id}`}
                className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Intensity
              </label>
              <select
                id={`ex-intensity-${entry.id}`}
                value={form.intensity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    intensity: e.target.value as ExerciseIntensity,
                  })
                }
                className={inputClass}
                aria-invalid={Boolean(fieldErrors.intensity)}
              >
                {EXERCISE_INTENSITIES.map((i) => (
                  <option key={i} value={i}>
                    {i.charAt(0).toUpperCase() + i.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {liveEstimate ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Estimated burn:{" "}
              <span className="font-medium tabular-nums text-neutral-700 dark:text-neutral-200">
                ~{liveEstimate.estimatedKcal} kcal
              </span>{" "}
              <span className="text-neutral-400">(estimate)</span>
            </p>
          ) : null}

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="brand-gradient inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={cancelEdit}
              className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-neutral-600 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 disabled:opacity-60 dark:text-neutral-300 dark:ring-neutral-600 dark:hover:bg-neutral-900"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="text-sm" data-testid="exercise-row">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate font-medium text-neutral-900 dark:text-neutral-100">
          {entry.displayName}
          <span className="ml-1.5 font-normal text-neutral-500 dark:text-neutral-400">
            · {entry.durationMin} min
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
            {fmtEstimateKcal(entry.estimatedKcal)}
          </span>
          <span className="flex items-center -mr-1">
            <button
              type="button"
              onClick={startEdit}
              aria-label={`Edit ${entry.displayName}`}
              title="Edit"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-brand-blue transition hover:bg-brand-blue/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue dark:text-blue-400 dark:hover:bg-brand-blue/20"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              onClick={() => setMode("confirmingDelete")}
              aria-label={`Remove ${entry.displayName}`}
              title="Remove"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
            >
              <TrashIcon />
            </button>
          </span>
        </span>
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}
