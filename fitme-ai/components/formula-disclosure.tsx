import type { ReactNode } from "react";
import type { BaselineBurnResult } from "@/lib/domain/burn/baseline";

type DisclosureProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

/**
 * Compact, consistent “how we calculated this” disclosure.
 * Small type, short lines — secondary to the main metric.
 */
export function FormulaDisclosure({
  title,
  children,
  className = "",
}: DisclosureProps) {
  return (
    <details
      className={`group mt-3 border-t border-neutral-200/70 pt-2.5 dark:border-neutral-700/70 ${className}`}
    >
      <summary className="cursor-pointer list-none text-[11px] font-normal italic tracking-wide text-neutral-400 marker:content-none transition-colors hover:text-neutral-500 dark:text-neutral-500 dark:hover:text-neutral-400 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="text-[9px] not-italic text-neutral-400/80 transition-transform group-open:rotate-90 dark:text-neutral-600"
            aria-hidden="true"
          >
            ▸
          </span>
          {title}
        </span>
      </summary>
      <div className="mt-2 space-y-2">{children}</div>
    </details>
  );
}

type RowProps = {
  label: string;
  value: string;
  formula?: string;
  meta?: string;
};

/** One calc step: label + result, formula underneath in quieter type. */
export function FormulaRow({ label, value, formula, meta }: RowProps) {
  return (
    <div className="rounded-lg bg-neutral-100/70 px-2.5 py-2 dark:bg-neutral-950/45">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">
          {label}
        </span>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
          {value}
        </span>
      </div>
      {meta ? (
        <p className="mt-0.5 text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">
          {meta}
        </p>
      ) : null}
      {formula ? (
        <p className="mt-1 font-mono text-[10px] leading-snug break-words text-neutral-500 dark:text-neutral-400">
          {formula}
        </p>
      ) : null}
    </div>
  );
}

export function FormulaNote({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">
      {children}
    </p>
  );
}

/**
 * Shared Baseline Burn transparency block (dashboard + burn panel).
 *
 * The one-line arithmetic is always visible — a number the whole dashboard
 * hangs off shouldn't need a click to justify itself. The disclosure keeps the
 * long-form Mifflin–St Jeor expressions for anyone who wants to check them.
 */
export function BaselineBurnCalcDetails({ burn }: { burn: BaselineBurnResult }) {
  const activityLabel = burn.activityLevel.replaceAll("_", " ");

  return (
    <>
      <p
        className="mt-2 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400"
        data-testid="baseline-burn-gist"
      >
        <span className="tabular-nums font-medium text-neutral-700 dark:text-neutral-200">
          {Math.round(burn.baselineBurnKcal)} kcal
        </span>{" "}
        = BMR <span className="tabular-nums">{burn.bmrKcal}</span> ×{" "}
        <span className="tabular-nums">{burn.activityMultiplier}</span> (
        {activityLabel}), from Mifflin–St Jeor.
      </p>
      <FormulaDisclosure title="Show the full formula">
        <FormulaRow
          label="BMR"
          value={`${burn.bmrKcal} kcal`}
          meta="Mifflin–St Jeor"
          formula={burn.formulaBmr}
        />
        <FormulaRow
          label="Baseline Burn"
          value={`${Math.round(burn.baselineBurnKcal)} kcal/day`}
          meta={`TDEE · ${activityLabel} (${burn.activityMultiplier}×)`}
          formula={burn.formulaTdee}
        />
        <FormulaNote>{burn.limitation}</FormulaNote>
      </FormulaDisclosure>
    </>
  );
}
