"use client";

import type { IngredientBreakdownLine } from "@/lib/domain/nutrition/parse-types";
import { SourceBadge } from "./source-badge";

type Props = {
  itemId: string;
  lines: IngredientBreakdownLine[];
  onProportionChange: (
    itemId: string,
    ingredientSlug: string,
    newPct: number,
  ) => void;
};

function contribKcal(line: IngredientBreakdownLine): string {
  const v = line.contribution.energyKcal;
  return v === null ? "?" : `${v}`;
}

/**
 * Viewable / editable ingredient breakdown for composite dishes (FR-7).
 * Each line cites its dataSource (FR-10).
 */
export function IngredientBreakdown({
  itemId,
  lines,
  onProportionChange,
}: Props) {
  return (
    <details className="group mt-3 rounded-lg border border-neutral-200 open:bg-neutral-50 dark:border-neutral-800 dark:open:bg-neutral-900/40">
      <summary className="cursor-pointer list-none select-none px-3 py-2 text-[11px] font-normal italic tracking-wide text-neutral-400 marker:content-none transition-colors hover:text-neutral-500 dark:text-neutral-500 dark:hover:text-neutral-400 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="text-[9px] not-italic text-neutral-400/80 transition-transform group-open:rotate-90 dark:text-neutral-600"
            aria-hidden="true"
          >
            ▸
          </span>
          Ingredient breakdown ({lines.length})
        </span>
      </summary>
      <ul className="space-y-2 border-t border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
        {lines.map((line) => (
          <li
            key={line.ingredientSlug}
            className="space-y-1 text-[11px]"
            data-source={line.dataSource}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="inline-flex flex-wrap items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
                {line.name}
                <SourceBadge dataSource={line.dataSource} size="sm" />
              </span>
              <span className="text-xs text-neutral-500">
                {line.grams}g · {contribKcal(line)} kcal
              </span>
            </div>
            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="w-20 shrink-0">Proportion</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={line.proportionPct}
                aria-label={`Proportion for ${line.name}`}
                onChange={(e) =>
                  onProportionChange(
                    itemId,
                    line.ingredientSlug,
                    Number(e.target.value),
                  )
                }
                className="w-20 rounded-md border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
              />
              <span>%</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="px-3 pb-3 text-xs text-neutral-500">
        Proportions always normalize to 100%. Totals recompute from ingredients.
      </p>
    </details>
  );
}
