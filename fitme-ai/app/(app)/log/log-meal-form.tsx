"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  useTransition,
} from "react";
import {
  parseMealAction,
  rematchFoodDraftAction,
  saveMealDraftAction,
} from "@/app/actions/log";
import { useLogToast } from "@/components/log-toast-provider";
import {
  PARSE_QUEUE_EVENT,
  appendParseQueue,
  isBrowserOffline,
  loadParseQueue,
  removeParseQueueItem,
} from "@/lib/offline/browser-store";
import type { OfflineParseQueueItem } from "@/lib/offline/types";
import { newClientKey } from "@/lib/offline/food-cache";
import {
  applyClarifyingChip,
  selectClarifyingChipGroups,
  type ClarifyingChipOption,
} from "@/lib/domain/nutrition/clarifying-chips";
import { applyProportionEdit } from "@/lib/domain/nutrition/decompose";
import { recomputeDraftNutrition } from "@/lib/domain/nutrition/draft-recompute";
import { DatetimeLocalField } from "@/components/datetime-local-field";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/domain/datetime-local";
import {
  clampFutureInstant,
  FUTURE_TIME_MESSAGE,
  INVALID_TIME_MESSAGE,
  isFutureInstant,
} from "@/lib/domain/log-time";
import { FOOD_PARSE_UNITS, MEAL_TYPE_OPTIONS } from "@/lib/domain/nutrition/food-options";
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

/** One save is one review list; the save schema accepts no more than this. */
const MAX_REVIEW_ITEMS = 20;

function scrollToReview() {
  requestAnimationFrame(() => {
    document
      .getElementById("log-review-section")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

/** Lets sibling components push drafts straight into the review list. */
export type LogMealFormHandle = {
  addDraft: (draft: ParsedFoodItemDraft) => void;
  /** Returns how many fit — the rest would overflow one save. */
  addDrafts: (drafts: ParsedFoodItemDraft[]) => { added: number; skipped: number };
};

type Props = {
  ref?: React.Ref<LogMealFormHandle>;
  /** From server — null means unlimited (Pro). */
  aiParsesRemaining?: number | null;
  freePlan?: boolean;
};

export function LogMealForm({ ref, aiParsesRemaining = null, freePlan = false }: Props) {
  const { showLogToast } = useLogToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, startSaveTransition] = useTransition();
  const [text, setText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [items, setItems] = useState<ParsedFoodItemDraft[] | null>(null);
  /** Null until the user picks a time — falls back to the drafts' own stamp. */
  const [mealTime, setMealTime] = useState<string | null>(null);
  const [aiInteractionId, setAiInteractionId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [queuedParses, setQueuedParses] = useState<OfflineParseQueueItem[]>([]);

  useEffect(() => {
    function sync() {
      setQueuedParses(loadParseQueue());
    }
    sync();
    window.addEventListener(PARSE_QUEUE_EVENT, sync);
    window.addEventListener("online", sync);
    return () => {
      window.removeEventListener(PARSE_QUEUE_EVENT, sync);
      window.removeEventListener("online", sync);
    };
  }, []);

  function discardQueuedParse(clientKey: string) {
    removeParseQueueItem(clientKey);
    setQueuedParses(loadParseQueue());
  }

  function restoreQueuedParse(item: OfflineParseQueueItem) {
    setText(item.text);
    setFormError(null);
    discardQueuedParse(item.clientKey);
    requestAnimationFrame(() => {
      document.getElementById("meal-text")?.focus();
    });
  }

  const addDraft = useCallback((draft: ParsedFoodItemDraft) => {
    setItems((prev) => [...(prev ?? []), draft]);
    setFormError(null);
    setShowManual(false);
    scrollToReview();
  }, []);

  const addDrafts = useCallback(
    (drafts: ParsedFoodItemDraft[]) => {
      const room = Math.max(0, MAX_REVIEW_ITEMS - (items?.length ?? 0));
      const fitting = drafts.slice(0, room);
      if (fitting.length > 0) {
        setItems((prev) => [...(prev ?? []), ...fitting]);
        setFormError(null);
        setShowManual(false);
        scrollToReview();
      }
      return {
        added: fitting.length,
        skipped: drafts.length - fitting.length,
      };
    },
    [items],
  );

  useImperativeHandle(
    ref,
    () => ({ addDraft, addDrafts }),
    [addDraft, addDrafts],
  );

  function onParse(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    // Keep drafts the user already staged (manual adds, re-logged favourites);
    // only this parse's own previous results are replaced.
    setItems((prev) => {
      const kept = (prev ?? []).filter((i) => i.origin !== "ai_parse");
      return kept.length > 0 ? kept : null;
    });
    setAiInteractionId(null);
    setShowManual(false);
    setQuotaExceeded(false);

    startTransition(async () => {
      if (isBrowserOffline()) {
        appendParseQueue({
          clientKey: newClientKey(),
          kind: "smart_parse",
          text,
          queuedAt: new Date().toISOString(),
        });
        setQueuedParses(loadParseQueue());
        setFormError(
          "You're offline — we queued this for smart parse when you're back. Use Quick log for cached foods now.",
        );
        setShowManual(true);
        return;
      }
      try {
        const result = await parseMealAction({ text });
        if (result.ok) {
          const loggedAt = new Date().toISOString();
          setItems((prev) => [
            ...(prev ?? []),
            ...result.data.items.map((item) => ({ ...item, loggedAt })),
          ]);
          setAiInteractionId(result.data.aiInteractionId);
          setQuotaExceeded(false);
          router.refresh();
          return;
        }
        setFormError(result.error);
        setQuotaExceeded(result.fieldErrors?.code === "ai_quota_exceeded");
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

  /**
   * Shown in the picker: the user's choice if they made one, else the time the
   * first draft carries (now, for a fresh parse). Derived rather than synced in
   * an effect so drafts arriving later can't clobber an explicit choice.
   */
  const mealTimeValue =
    mealTime ??
    (items && items.length > 0
      ? toDatetimeLocalValue(items[0].loggedAt)
      : toDatetimeLocalValue(new Date()));

  /** Copied days arrive spread across the day; a fresh parse shares one stamp. */
  const mixedTimes =
    mealTime === null &&
    items != null &&
    new Set(items.map((item) => item.loggedAt)).size > 1;

  function removeItem(id: string) {
    setFormError(null);
    setItems((prev) => {
      const next = (prev ?? []).filter((item) => item.id !== id);
      return next.length > 0 ? next : null;
    });
  }

  function onSave() {
    if (!items || items.length === 0) return;
    setFormError(null);

    /**
     * An explicit pick applies to every item. Left alone, each item keeps the
     * time it arrived with — a copied day would otherwise collapse breakfast,
     * lunch and dinner onto one timestamp.
     */
    let itemsToSave = items;
    if (mealTime !== null) {
      const loggedAt = fromDatetimeLocalValue(mealTime);
      if (Number.isNaN(loggedAt.getTime())) {
        setFormError(INVALID_TIME_MESSAGE);
        return;
      }
      if (isFutureInstant(loggedAt)) {
        setFormError(FUTURE_TIME_MESSAGE);
        return;
      }
      const loggedAtIso = loggedAt.toISOString();
      itemsToSave = items.map((item) => ({ ...item, loggedAt: loggedAtIso }));
    } else {
      const own = items.map((item) =>
        clampFutureInstant(new Date(item.loggedAt)),
      );
      if (own.some((d) => Number.isNaN(d.getTime()))) {
        setFormError(INVALID_TIME_MESSAGE);
        return;
      }
      itemsToSave = items.map((item, i) => ({
        ...item,
        loggedAt: own[i]!.toISOString(),
      }));
    }

    startSaveTransition(async () => {
      try {
        const result = await saveMealDraftAction({
          confirmed: true,
          items: itemsToSave,
          aiInteractionId,
        });
        if (result.ok) {
          const n = result.data.entries.length;
          const c = result.data.correctionCount;
          showLogToast(
            c > 0
              ? `Saved ${n} item${n === 1 ? "" : "s"} (${c} correction${c === 1 ? "" : "s"} recorded).`
              : `Saved ${n} item${n === 1 ? "" : "s"}.`,
          );
          setItems(null);
          setMealTime(null);
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
    setMealTime(null);
    setAiInteractionId(null);
    setFormError(null);
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
      {queuedParses.length > 0 ? (
        <section
          className="rounded-2xl border border-amber-300/70 bg-amber-50/70 p-4 dark:border-amber-800/60 dark:bg-amber-950/20"
          aria-label="Saved while offline"
          data-testid="queued-parses"
        >
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Saved while you were offline
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            These descriptions are still waiting — nothing was logged yet.
          </p>
          <ul className="mt-3 space-y-2">
            {queuedParses.map((item) => (
              <li
                key={item.clientKey}
                className="flex items-start justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 dark:bg-neutral-900/50"
              >
                <span className="min-w-0 break-words text-sm text-neutral-800 dark:text-neutral-200">
                  {item.text}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => restoreQueuedParse(item)}
                    className="text-xs font-medium text-brand-blue underline-offset-2 hover:underline"
                  >
                    Use
                  </button>
                  <button
                    type="button"
                    onClick={() => discardQueuedParse(item.clientKey)}
                    className="text-xs font-medium text-neutral-500 underline-offset-2 hover:text-red-600 hover:underline"
                  >
                    Discard
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form
        onSubmit={onParse}
        className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
      >
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
          className="brand-gradient inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-base font-medium text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-50"
        >
          {pending ? "Parsing…" : "Parse meal"}
        </button>
      </form>

      <ParseLoading active={pending} />

      {freePlan &&
      aiParsesRemaining !== null &&
      aiParsesRemaining <= 3 &&
      aiParsesRemaining > 0 ? (
        <p className="text-sm text-amber-800 dark:text-amber-200/90" role="status">
          {aiParsesRemaining} free smart parse{aiParsesRemaining === 1 ? "" : "s"}{" "}
          left today.
        </p>
      ) : null}

      {formError ? (
        <div className="space-y-2" role="alert">
          <p
            className={
              quotaExceeded
                ? "text-sm text-amber-800 dark:text-amber-200/90"
                : "text-sm text-red-700 dark:text-red-400"
            }
          >
            {formError}
          </p>
          {quotaExceeded ? (
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              <Link
                href="/settings/billing"
                className="font-medium text-brand-blue underline-offset-2 hover:underline"
              >
                Upgrade to Pro
              </Link>{" "}
              for unlimited smart parsing.
            </p>
          ) : null}
        </div>
      ) : null}

      {chipGroups.length > 0 ? (
        <ClarifyingChips groups={chipGroups} onSelect={onChipSelect} />
      ) : null}

      {items && items.length > 0 ? (
        <section
          id="log-review-section"
          className="space-y-3"
          aria-label="Parsed foods"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Review items
            </h2>
            <DatetimeLocalField
              id="log-meal-time"
              label="When did you eat this?"
              value={mealTimeValue}
              onChange={setMealTime}
              max={toDatetimeLocalValue(new Date())}
              className="w-full sm:w-64"
              compact
              required
            />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {mixedTimes
              ? "These items keep their own times. Pick a time here to put them all at the same moment instead."
              : "Defaults to now. Change it to log a meal you ate earlier — it lands on that day’s totals."}
          </p>
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
                    {FOOD_PARSE_UNITS.map((u) => (
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
                    {MEAL_TYPE_OPTIONS.map(([value, label]) => (
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
                <label className="mt-3 block text-xs text-neutral-600 dark:text-neutral-400">
                  Note (optional)
                  <input
                    aria-label={`Note for ${item.name}`}
                    value={item.note ?? ""}
                    maxLength={500}
                    disabled={saving}
                    placeholder="e.g. shared half, home cooked, felt heavy after"
                    onChange={(e) =>
                      updateItem(item.id, { note: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white/80 px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950/60 dark:text-neutral-100"
                  />
                </label>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {item.needsClarification ? "Needs clarification" : null}
                    {item.needsClarification && item.dataSource === "ai_estimated"
                      ? " · "
                      : null}
                    {item.dataSource === "ai_estimated"
                      ? "Estimate, not medical advice"
                      : null}
                  </p>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => removeItem(item.id)}
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium text-neutral-500 underline-offset-2 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
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
