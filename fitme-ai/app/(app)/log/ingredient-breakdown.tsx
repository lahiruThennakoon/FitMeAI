"use client";

import type { IngredientBreakdownLine } from "@/lib/domain/nutrition/parse-types";

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
 */
export function IngredientBreakdown({
  itemId,
  lines,
  onProportionChange,
}: Props) {
  return (
    <details className="mt-3 rounded-lg border border-neutral-200 open:bg-neutral-50 dark:border-neutral-800 dark:open:bg-neutral-900/40">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
        Ingredient breakdown ({lines.length})
      </summary>
      <ul className="space-y-2 border-t border-neutral-200 px-3 py-3 dark:border-neutral-800">
        {lines.map((line) => (
          <li key={line.ingredientSlug} className="space-y-1 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {line.name}
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
