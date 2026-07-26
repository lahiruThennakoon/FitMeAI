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
};

/**
 * Today's meal list with inline edit/soft-delete (Story 5.2 / FR-9 correction
 * path). Fixing a mistake is calm and reversible-feeling — no shame copy.
 */
export function TodayMealsList({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <p className="mt-4 border-t border-neutral-200 pt-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
        No meals yet today — a short description is enough to get started.
      </p>
    );
  }

  return (
    <ul
      className="mt-4 space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-700"
      data-testid="today-meals-list"
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
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate font-medium text-neutral-900 dark:text-neutral-100">
          {entry.name}
        </span>
        <span className="shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">
          {fmtKcal(entry.energyKcal)}
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={startEdit}
            className="text-xs font-medium text-neutral-500 underline-offset-2 hover:text-brand-blue hover:underline dark:text-neutral-400"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode("confirmingDelete")}
            className="text-xs font-medium text-neutral-500 underline-offset-2 hover:text-red-600 hover:underline dark:text-neutral-400"
          >
            Delete
          </button>
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
