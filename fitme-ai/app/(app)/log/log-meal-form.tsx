"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  parseMealAction,
  rematchFoodDraftAction,
  saveMealDraftAction,
} from "@/app/actions/log";
import {
  appendParseQueue,
  isBrowserOffline,
} from "@/lib/offline/browser-store";
import { newClientKey } from "@/lib/offline/food-cache";
import {
  applyClarifyingChip,
  selectClarifyingChipGroups,
  type ClarifyingChipOption,
} from "@/lib/domain/nutrition/clarifying-chips";
import { applyProportionEdit } from "@/lib/domain/nutrition/decompose";
import { recomputeDraftNutrition } from "@/lib/domain/nutrition/draft-recompute";
import type {
  ParsedFoodItemDraft,
} from "@/lib/domain/nutrition/parse-types";
import {
  sourceCardClassName,
  sourceCitationText,
} from "@/lib/domain/nutrition/source-citation";
import type { NutritionMacros } from "@/lib/domain/nutrition/types";
import { ClarifyingChips } from "./clarifying-chips";
import { IngredientBreakdown } from "./ingredient-breakdown";
import { ParseLoading } from "./parse-loading";
import { SourceBadge } from "./source-badge";

const MACRO_FIELDS: Array<{
  key: keyof NutritionMacros;
  label: string;
  step: string;
}> = [
  { key: "energyKcal", label: "Calories", step: "1" },
  { key: "proteinG", label: "Protein (g)", step: "0.1" },
  { key: "carbsG", label: "Carbs (g)", step: "0.1" },
  { key: "fatG", label: "Fat (g)", step: "0.1" },
  { key: "fibreG", label: "Fibre (g)", step: "0.1" },
  { key: "sugarG", label: "Sugar (g)", step: "0.1" },
  { key: "sodiumMg", label: "Sodium (mg)", step: "1" },
];

export function LogMealForm() {
  const [pending, startTransition] = useTransition();
  const [saving, startSaveTransition] = useTransition();
  const [text, setText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [items, setItems] = useState<ParsedFoodItemDraft[] | null>(null);
  const [aiInteractionId, setAiInteractionId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualQty, setManualQty] = useState("1");

  function onParse(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSaveMessage(null);
    setItems(null);
    setAiInteractionId(null);
    setShowManual(false);

    startTransition(async () => {
      if (isBrowserOffline()) {
        appendParseQueue({
          clientKey: newClientKey(),
          kind: "smart_parse",
          text,
          queuedAt: new Date().toISOString(),
        });
        setFormError(
          "You're offline — we queued this for smart parse when you're back. Use Quick log for cached foods now.",
        );
        setShowManual(true);
        return;
      }
      try {
        const result = await parseMealAction({ text });
        if (result.ok) {
          setItems(result.data.items);
          setAiInteractionId(result.data.aiInteractionId);
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
      breakdown: null,
      kind: "estimated",
      origin: "manual",
      aiSnapshot: null,
    };
    setItems((prev) => [...(prev ?? []), draft]);
    setManualName("");
    setManualQty("1");
    setShowManual(false);
    setFormError(null);
    setSaveMessage(null);
  }

  function updateItem(id: string, patch: Partial<ParsedFoodItemDraft>) {
    setItems((prev) =>
      prev
        ? prev.map((item) => {
            if (item.id !== id) return item;
            let next = { ...item, ...patch };
            // Identity edit drops catalog FK + DB macros until rematch (FR-11).
            if (
              "name" in patch &&
              typeof patch.name === "string" &&
              patch.name.trim() !== item.name.trim()
            ) {
              next = {
                ...next,
                foodSlug: null,
                catalog: null,
                breakdown: null,
                kind: "estimated",
                dataSource: "ai_estimated",
                ...(item.dataSource === "database"
                  ? {
                      nutrition: {
                        energyKcal: null,
                        proteinG: null,
                        carbsG: null,
                        fatG: null,
                        fibreG: null,
                        sugarG: null,
                        sodiumMg: null,
                      },
                    }
                  : {}),
              };
            }
            if ("quantity" in patch || "unit" in patch) {
              return recomputeDraftNutrition(next);
            }
            return next;
          })
        : prev,
    );
  }

  /** Prefer catalog match when the name changes (FR-11). */
  function onNameBlur(id: string, rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    const current = items?.find((row) => row.id === id);
    if (!current) return;
    // Skip no-op blur; rematch only when the name actually changed.
    if (name === current.name.trim() && current.foodSlug) return;
    startTransition(async () => {
      try {
        const result = await rematchFoodDraftAction({
          id: current.id,
          name,
          quantity: current.quantity,
          unit: current.unit,
          mealType: current.mealType,
          loggedAt: current.loggedAt,
          confidence: current.confidence,
          origin: current.origin,
          aiSnapshot: current.aiSnapshot,
          nutrition: current.nutrition,
        });
        if (!result.ok) return;
        setItems((prev) =>
          prev
            ? prev.map((row) => (row.id === id ? result.data : row))
            : prev,
        );
      } catch {
        // Keep local draft if rematch fails.
      }
    });
  }

  function updateMacro(
    id: string,
    key: keyof NutritionMacros,
    raw: string,
  ) {
    setItems((prev) =>
      prev
        ? prev.map((item) => {
            if (item.id !== id) return item;
            const parsed =
              raw.trim() === "" ? null : Number(raw);
            const value =
              parsed === null || !Number.isFinite(parsed) ? null : parsed;
            return {
              ...item,
              nutrition: { ...item.nutrition, [key]: value },
            };
          })
        : prev,
    );
  }

  function onSave() {
    if (!items || items.length === 0) return;
    setFormError(null);
    setSaveMessage(null);
    startSaveTransition(async () => {
      try {
        const result = await saveMealDraftAction({
          confirmed: true,
          items,
          aiInteractionId,
        });
        if (result.ok) {
          const n = result.data.entries.length;
          const c = result.data.correctionCount;
          setSaveMessage(
            c > 0
              ? `Saved ${n} item${n === 1 ? "" : "s"} (${c} correction${c === 1 ? "" : "s"} recorded).`
              : `Saved ${n} item${n === 1 ? "" : "s"}.`,
          );
          setItems(null);
          setAiInteractionId(null);
          setText("");
          return;
        }
        setFormError(result.error);
      } catch {
        setFormError("Could not save your log. Please try again.");
      }
    });
  }

  function onDiscard() {
    setItems(null);
    setAiInteractionId(null);
    setFormError(null);
    setSaveMessage(null);
    setShowManual(false);
  }

  function updateProportion(
    itemId: string,
    ingredientSlug: string,
    newPct: number,
  ) {
    setItems((prev) =>
      prev
        ? prev.map((item) =>
            item.id === itemId
              ? applyProportionEdit(item, ingredientSlug, newPct)
              : item,
          )
        : prev,
    );
  }

  function onChipSelect(itemId: string, option: ClarifyingChipOption) {
    setItems((prev) =>
      prev
        ? prev.map((item) =>
            item.id === itemId ? applyClarifyingChip(item, option) : item,
          )
        : prev,
    );
  }

  const chipGroups = items ? selectClarifyingChipGroups(items) : [];

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

      <ParseLoading active={pending} />

      {formError ? (
        <p
          className="text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      {saveMessage ? (
        <p
          className="text-sm text-emerald-800 dark:text-emerald-300"
          role="status"
        >
          {saveMessage}
        </p>
      ) : null}

      {chipGroups.length > 0 ? (
        <ClarifyingChips groups={chipGroups} onSelect={onChipSelect} />
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
                className={`rounded-xl border p-4 ${sourceCardClassName(item.dataSource)}`}
                data-source={item.dataSource}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    aria-label={`Name for ${item.name}`}
                    value={item.name}
                    onChange={(e) =>
                      updateItem(item.id, { name: e.target.value })
                    }
                    onBlur={(e) => onNameBlur(item.id, e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-sm font-medium dark:border-neutral-700"
                  />
                  <SourceBadge
                    dataSource={item.dataSource}
                    confidence={item.confidence}
                  />
                </div>
                {item.dataSource === "ai_estimated" ? (
                  <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-100/90">
                    Not in FitMe’s food list — these numbers are estimates you
                    can edit. Rename to a known food to match the list.
                  </p>
                ) : null}
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
                        ["breakfast", "Breakfast"],
                        ["lunch", "Lunch"],
                        ["dinner", "Dinner"],
                        ["snack", "Snack"],
                        ["unknown", "Not sure"],
                      ] as const
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <fieldset className="mt-3 space-y-2">
                  <legend className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Nutrition
                  </legend>
                  {item.dataSource === "ai_estimated" &&
                  MACRO_FIELDS.every(
                    ({ key }) => item.nutrition[key] === null,
                  ) ? (
                    <p className="rounded-lg bg-amber-100/60 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/40 dark:text-amber-50">
                      No numbers yet — fill them in, or try parsing again with a
                      clearer amount (e.g. “100g chicken liver”).
                    </p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {MACRO_FIELDS.map(({ key, label, step }) => (
                      <label
                        key={key}
                        className="flex flex-col gap-0.5 text-xs text-neutral-600 dark:text-neutral-400"
                      >
                        {label}
                        <input
                          aria-label={`${label} for ${item.name}. ${sourceCitationText(item.dataSource, item.confidence)}`}
                          type="number"
                          step={step}
                          min={0}
                          value={item.nutrition[key] ?? ""}
                          disabled={saving}
                          onChange={(e) =>
                            updateMacro(item.id, key, e.target.value)
                          }
                          className="rounded-lg border border-neutral-300 bg-white/80 px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950/60 dark:text-neutral-100"
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(item.loggedAt).toLocaleString()}
                  {item.needsClarification ? " · needs clarification" : ""}
                  {item.dataSource === "ai_estimated"
                    ? " · estimate, not medical advice"
                    : ""}
                </p>
                {item.breakdown && item.breakdown.length > 0 ? (
                  <IngredientBreakdown
                    itemId={item.id}
                    lines={item.breakdown}
                    onProportionChange={updateProportion}
                  />
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={saving || pending}
              onClick={onSave}
              className="brand-gradient inline-flex h-12 flex-1 items-center justify-center rounded-xl px-6 text-base font-medium text-white shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save log"}
            </button>
            <button
              type="button"
              disabled={saving || pending}
              onClick={onDiscard}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-xl px-6 text-base font-medium text-neutral-700 ring-1 ring-inset ring-neutral-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-50 dark:text-neutral-200 dark:ring-neutral-600"
            >
              Discard
            </button>
          </div>
          <p className="text-xs text-neutral-500">
            Nothing is stored until you tap Save log. Discard clears this review
            without writing to your account.
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
