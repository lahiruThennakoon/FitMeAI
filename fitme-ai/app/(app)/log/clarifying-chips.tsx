"use client";

import type {
  ClarifyingChipGroup,
  ClarifyingChipOption,
} from "@/lib/domain/nutrition/clarifying-chips";

type Props = {
  groups: ClarifyingChipGroup[];
  onSelect: (itemId: string, option: ClarifyingChipOption) => void;
};

/**
 * Accessible clarifying chips (FR-8 / UX-DR4 / UX-DR7).
 * Native buttons for keyboard focus; radiogroup semantics per attribute.
 */
export function ClarifyingChips({ groups, onSelect }: Props) {
  if (groups.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Clarifying questions">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Quick clarifications
      </h2>
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        Tap a portion only when something looks unclear — skip if it already
        looks right.
      </p>
      <ul className="space-y-3">
        {groups.map((group) => (
          <li
            key={group.itemId}
            className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/20"
          >
            <p
              id={`chip-prompt-${group.itemId}`}
              className="text-sm font-medium text-neutral-900 dark:text-neutral-100"
            >
              {group.prompt}
            </p>
            <div
              role="group"
              aria-labelledby={`chip-prompt-${group.itemId}`}
              className="mt-2 flex flex-wrap gap-2"
            >
              {group.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelect(group.itemId, option)}
                  className="inline-flex min-h-11 min-w-[4.5rem] items-center justify-center rounded-xl px-4 text-sm font-medium text-brand-blue ring-1 ring-inset ring-brand-blue/35 transition hover:bg-brand-blue/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
