"use client";

import { useEffect, useState } from "react";

export const PARSE_LOADING_TIPS = [
  "Tip: “100g chickpeas” is clearer than “some chickpeas”.",
  "Tip: Sri Lankan staples like pol sambol and dhal curry match our catalog.",
  "Tip: You can always enter foods manually if parsing misses something.",
  "Tip: List items with commas — “two eggs, one milk tea”.",
] as const;

const STEPS = [
  "Reading your description",
  "Matching the nutrition catalog",
  "Estimating anything unknown",
] as const;

type Props = {
  active?: boolean;
};

/**
 * Loading transparency while food parse runs (UX-DR3 / FR-10 companion).
 */
export function ParseLoading({ active = true }: Props) {
  const [tipIndex, setTipIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    setStepIndex(0);
    setTipIndex(0);
    const tipId = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % PARSE_LOADING_TIPS.length);
    }, 2800);
    // Advance through steps once; hold on the last (no regressing bar).
    const stepId = window.setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 1600);
    return () => {
      window.clearInterval(tipId);
      window.clearInterval(stepId);
    };
  }, [active]);

  if (!active) return null;

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div
      className="rounded-xl border border-brand-blue/25 bg-brand-blue/5 px-4 py-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="parse-loading"
    >
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        Matching foods and estimating nutrition…
      </p>
      <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
        {STEPS[stepIndex]}
      </p>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-brand-blue transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className={
              i === stepIndex
                ? "font-medium text-neutral-900 dark:text-neutral-100"
                : i < stepIndex
                  ? "text-brand-blue"
                  : undefined
            }
          >
            {i + 1}. {step}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {PARSE_LOADING_TIPS[tipIndex]}
      </p>
    </div>
  );
}
