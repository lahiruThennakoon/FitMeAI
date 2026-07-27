"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteFoodEntryAction,
  updateFoodEntryAction,
} from "@/app/actions/food-entry";
import type { FoodEntryEditableDto } from "@/lib/dal/food-entry";

function fmtKcal(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${Math.round(v)} kcal`;
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

function numOrNull(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

type EditFormState = {
  name: string;
  quantity: string;
  energyKcal: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fibreG: string;
  sugarG: string;
};

function toFormState(entry: FoodEntryEditableDto): EditFormState {
  return {
    name: entry.name,
    quantity: String(entry.quantity),
    energyKcal: entry.energyKcal == null ? "" : String(entry.energyKcal),
    proteinG: entry.proteinG == null ? "" : String(entry.proteinG),
    carbsG: entry.carbsG == null ? "" : String(entry.carbsG),
    fatG: entry.fatG == null ? "" : String(entry.fatG),
    fibreG: entry.fibreG == null ? "" : String(entry.fibreG),
    sugarG: entry.sugarG == null ? "" : String(entry.sugarG),
  };
}

type Props = {
  entries: FoodEntryEditableDto[];
  isToday?: boolean;
};

/**
 * Today's meal list with inline edit/soft-delete (Story 5.2 / FR-9 correction
 * path). Fixing a mistake is calm and reversible-feeling — no shame copy.
 */
export function TodayMealsList({ entries, isToday = true }: Props) {
  if (entries.length === 0) {
    return (
      <p className="mt-4 border-t border-neutral-200 pt-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
        {isToday
          ? "No meals yet today — a short description is enough to get started."
          : "No meals logged yesterday — that's fine. Today is a fresh page."}
      </p>
    );
  }

  return (
    <ul
      className="soft-scroll mt-4 max-h-52 space-y-2 overflow-y-auto overscroll-contain border-t border-neutral-200 pt-4 dark:border-neutral-700"
      data-testid="today-meals-list"
      aria-label={isToday ? "Today's meals, scrollable" : "Yesterday's meals, scrollable"}
    >
      {entries.map((entry) => (
        <MealRow key={entry.id} entry={entry} />
      ))}
    </ul>
  );
}

type RowMode = "view" | "editing" | "confirmingDelete";

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

function MealRow({ entry }: { entry: FoodEntryEditableDto }) {
  const router = useRouter();
  const [mode, setMode] = useState<RowMode>("view");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EditFormState>(() => toFormState(entry));

  function startEdit() {
    setForm(toFormState(entry));
    setError(null);
    setMode("editing");
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateFoodEntryAction(entry.id, {
        name: form.name,
        quantity: numOrNull(form.quantity) ?? entry.quantity,
        energyKcal: numOrNull(form.energyKcal),
        proteinG: numOrNull(form.proteinG),
        carbsG: numOrNull(form.carbsG),
        fatG: numOrNull(form.fatG),
        fibreG: numOrNull(form.fibreG),
        sugarG: numOrNull(form.sugarG),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMode("view");
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteFoodEntryAction(entry.id);
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
        data-testid="meal-row-confirm-delete"
      >
        <span className="text-red-900 dark:text-red-100">
          Remove &ldquo;{entry.name}&rdquo; from today?
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
        data-testid="meal-row-editing"
      >
        <form onSubmit={handleSave} className="space-y-2.5" noValidate>
          <div>
            <label
              htmlFor={`name-${entry.id}`}
              className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              Name
            </label>
            <input
              id={`name-${entry.id}`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              maxLength={120}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`quantity-${entry.id}`}
                className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Quantity ({entry.unit})
              </label>
              <input
                id={`quantity-${entry.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: e.target.value })
                }
                className={inputClass}
                required
              />
            </div>
            <div>
              <label
                htmlFor={`energy-${entry.id}`}
                className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Calories (kcal)
              </label>
              <input
                id={`energy-${entry.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                value={form.energyKcal}
                onChange={(e) =>
                  setForm({ ...form, energyKcal: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`protein-${entry.id}`}
                className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Protein (g)
              </label>
              <input
                id={`protein-${entry.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                value={form.proteinG}
                onChange={(e) =>
                  setForm({ ...form, proteinG: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`carbs-${entry.id}`}
                className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Carbs (g)
              </label>
              <input
                id={`carbs-${entry.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                value={form.carbsG}
                onChange={(e) => setForm({ ...form, carbsG: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`fat-${entry.id}`}
                className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Fat (g)
              </label>
              <input
                id={`fat-${entry.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                value={form.fatG}
                onChange={(e) => setForm({ ...form, fatG: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`fibre-${entry.id}`}
                className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Fibre (g)
              </label>
              <input
                id={`fibre-${entry.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                value={form.fibreG}
                onChange={(e) => setForm({ ...form, fibreG: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`sugar-${entry.id}`}
                className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Sugar (g)
              </label>
              <input
                id={`sugar-${entry.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                value={form.sugarG}
                onChange={(e) => setForm({ ...form, sugarG: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

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
              onClick={() => setMode("view")}
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
    <li className="text-sm" data-testid="meal-row">
      {/* Same two-side rhythm as macro/energy rows: label left, value+actions right. */}
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate font-medium text-neutral-900 dark:text-neutral-100">
          {entry.name}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
            {fmtKcal(entry.energyKcal)}
          </span>
          <span className="flex items-center -mr-1">
            <button
              type="button"
              onClick={startEdit}
              aria-label={`Edit ${entry.name}`}
              title="Edit"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-brand-blue transition hover:bg-brand-blue/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue dark:text-blue-400 dark:hover:bg-brand-blue/20"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              onClick={() => setMode("confirmingDelete")}
              aria-label={`Remove ${entry.name}`}
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
