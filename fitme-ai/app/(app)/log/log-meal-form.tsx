"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { parseMealAction } from "@/app/actions/log";
import { recomputeDraftNutrition } from "@/lib/domain/nutrition/draft-recompute";
import type { ParsedFoodItemDraft } from "@/lib/domain/nutrition/parse-types";

const LOADING_TIPS = [
  "Tip: “100g chickpeas” is clearer than “some chickpeas”.",
  "Tip: Sri Lankan staples like pol sambol and dhal curry match our catalog.",
  "Tip: You can always enter foods manually if parsing misses something.",
  "Tip: List items with commas — “two eggs, one milk tea”.",
];

function fmtMacro(v: number | null, suffix: string): string {
  return v === null ? `${suffix} ?` : `${suffix} ${v}`;
}

function macroLine(item: ParsedFoodItemDraft): string {
  const n = item.nutrition;
  return [
    n.energyKcal === null ? "kcal ?" : `${n.energyKcal} kcal`,
    fmtMacro(n.proteinG, "P"),
    fmtMacro(n.carbsG, "C"),
    fmtMacro(n.fatG, "F"),
    fmtMacro(n.fibreG, "Fi"),
    fmtMacro(n.sugarG, "Su"),
    n.sodiumMg === null ? "Na ?" : `Na ${n.sodiumMg}mg`,
  ].join(" · ");
}

export function LogMealForm() {
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [items, setItems] = useState<ParsedFoodItemDraft[] | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const id = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % LOADING_TIPS.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [pending]);

  function onParse(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setItems(null);
    setShowManual(false);

    startTransition(async () => {
      try {
        const result = await parseMealAction({ text });
        if (result.ok) {
          setItems(result.data.items);
          return;
        }
        setFormError(result.error);
        setShowManual(true);
      } catch {
        setFormError(
          "Something went wrong. Enter foods manually below, or try again.",
        );
        setShowManual(true);
      }
    });
  }

  function addManualItem(event: React.FormEvent) {
    event.preventDefault();
    const name = manualName.trim();
    const quantity = Number(manualQty);
    if (!name || !Number.isFinite(quantity) || quantity <= 0) return;

    const draft: ParsedFoodItemDraft = {
      id: `manual_${Date.now()}`,
      name,
      quantity,
      unit: "serving",
      mealType: "unknown",
      loggedAt: new Date().toISOString(),
      dataSource: "ai_estimated",
      confidence: 1,
      needsClarification: false,
      nutrition: {
        energyKcal: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
        fibreG: null,
        sugarG: null,
        sodiumMg: null,
      },
      foodSlug: null,
      catalog: null,
    };
    setItems((prev) => [...(prev ?? []), draft]);
    setManualName("");
    setManualQty("1");
    setShowManual(false);
    setFormError(null);
  }

  function updateItem(id: string, patch: Partial<ParsedFoodItemDraft>) {
    setItems((prev) =>
      prev
        ? prev.map((item) => {
            if (item.id !== id) return item;
            const next = { ...item, ...patch };
            if ("quantity" in patch || "unit" in patch) {
              return recomputeDraftNutrition(next);
            }
            return next;
          })
        : prev,
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onParse} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="meal-text"
            className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
          >
            Meal description
          </label>
          <textarea
            id="meal-text"
            name="text"
            rows={4}
            required
            maxLength={1000}
            value={text}
            disabled={pending}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. two eggs, one milk tea, 100g chickpeas, one dhal wade"
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 shadow-sm placeholder:text-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>

        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="brand-gradient inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-base font-medium text-white shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-50"
        >
          {pending ? "Parsing…" : "Parse meal"}
        </button>
      </form>

      {pending ? (
        <div
          className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-4 py-3"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Matching foods and estimating nutrition…
          </p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {LOADING_TIPS[tipIndex]}
          </p>
        </div>
      ) : null}

      {formError ? (
        <p
          className="text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      {items && items.length > 0 ? (
        <section className="space-y-3" aria-label="Parsed foods">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Review items
          </h2>
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    aria-label={`Name for ${item.name}`}
                    value={item.name}
                    onChange={(e) =>
                      updateItem(item.id, { name: e.target.value })
                    }
                    className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-sm font-medium dark:border-neutral-700"
                  />
                  <span
                    className={
                      item.dataSource === "database"
                        ? "rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        : "rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                    }
                  >
                    {item.dataSource === "database" ? "Database" : "Estimated"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    aria-label={`Quantity for ${item.name}`}
                    type="number"
                    min={0.1}
                    step="any"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, {
                        quantity: Number(e.target.value) || item.quantity,
                      })
                    }
                    className="w-20 rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
                  />
                  <select
                    aria-label={`Unit for ${item.name}`}
                    value={item.unit}
                    onChange={(e) =>
                      updateItem(item.id, {
                        unit: e.target.value as ParsedFoodItemDraft["unit"],
                      })
                    }
                    className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
                  >
                    {(
                      [
                        "g",
                        "piece",
                        "cup",
                        "tablespoon",
                        "bowl",
                        "plate",
                        "serving",
                      ] as const
                    ).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={`Meal type for ${item.name}`}
                    value={item.mealType}
                    onChange={(e) =>
                      updateItem(item.id, {
                        mealType: e.target
                          .value as ParsedFoodItemDraft["mealType"],
                      })
                    }
                    className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
                  >
                    {(
                      [
                        "breakfast",
                        "lunch",
                        "dinner",
                        "snack",
                        "unknown",
                      ] as const
                    ).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                  {macroLine(item)}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {new Date(item.loggedAt).toLocaleString()} · confidence{" "}
                  {Math.round(item.confidence * 100)}%
                  {item.needsClarification ? " · needs clarification" : ""}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500">
            Saving confirmed entries lands in a later story. You can keep editing
            these drafts now.
          </p>
        </section>
      ) : null}

      {showManual || (items && items.length > 0) ? (
        <section className="space-y-3" aria-label="Manual entry">
          {!showManual ? (
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="text-sm font-medium text-brand-blue underline-offset-2 hover:underline"
            >
              Add another food manually
            </button>
          ) : (
            <form onSubmit={addManualItem} className="space-y-3 rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
              <h2 className="text-sm font-semibold">Manual entry</h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Parsing is optional — you can always log by hand.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  aria-label="Food name"
                  placeholder="Food name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="min-w-[10rem] flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
                  required
                />
                <input
                  aria-label="Quantity"
                  type="number"
                  min={0.1}
                  step="any"
                  value={manualQty}
                  onChange={(e) => setManualQty(e.target.value)}
                  className="w-24 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
                  required
                />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium text-brand-blue ring-1 ring-inset ring-brand-blue/30"
                >
                  Add
                </button>
              </div>
            </form>
          )}
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="text-sm font-medium text-brand-blue underline-offset-2 hover:underline"
        >
          Skip AI — enter manually
        </button>
      )}

      <Link
        href="/dashboard"
        className="inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-base font-medium text-brand-blue ring-1 ring-inset ring-brand-blue/30"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
