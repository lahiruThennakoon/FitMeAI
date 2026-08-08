"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  dismissGettingStartedChecklist,
  isGettingStartedChecklistDismissed,
} from "@/lib/onboarding/browser";

type Props = {
  hasProfile: boolean;
  hasEverLoggedMeal: boolean;
};

type Step = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
};

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="M5.5 10.5 8.5 13.5 14.5 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Lightweight week-one checklist — auto-checks as the user completes actions.
 */
export function GettingStartedChecklist({
  hasProfile,
  hasEverLoggedMeal,
}: Props) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(isGettingStartedChecklistDismissed());
  }, []);

  const steps: Step[] = [
    {
      id: "profile",
      label: "Set up profile & targets",
      done: hasProfile,
      href: "/goals",
    },
    {
      id: "meal",
      label: "Log your first meal",
      done: hasEverLoggedMeal,
      href: "/log",
    },
    {
      id: "home",
      label: "Glance at Home",
      done: hasEverLoggedMeal,
    },
  ];

  const allDone = steps.every((step) => step.done);
  if (dismissed || allDone) return null;

  return (
    <section
      className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
      aria-labelledby="getting-started-heading"
      data-testid="getting-started-checklist"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="getting-started-heading"
            className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
          >
            Getting started
          </h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Three quick steps — no rush.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            dismissGettingStartedChecklist();
            setDismissed(true);
          }}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 transition hover:bg-neutral-200/60 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          aria-label="Dismiss getting started checklist"
        >
          Dismiss
        </button>
      </div>

      <ol className="mt-4 space-y-2.5">
        {steps.map((step, index) => {
          const content = (
            <>
              <span
                className={
                  step.done
                    ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-green dark:bg-brand-green/25"
                    : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold tabular-nums text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                }
                aria-hidden="true"
              >
                {step.done ? <CheckIcon /> : index + 1}
              </span>
              <span
                className={
                  step.done
                    ? "text-sm text-neutral-500 line-through dark:text-neutral-400"
                    : "text-sm font-medium text-neutral-800 dark:text-neutral-100"
                }
              >
                {step.label}
              </span>
            </>
          );

          if (step.href && !step.done) {
            return (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200/70 bg-neutral-50/80 px-3 py-2.5 transition hover:border-brand-blue/30 hover:bg-brand-blue/[0.04] dark:border-neutral-700 dark:bg-neutral-950/40 dark:hover:border-brand-blue/40"
                >
                  {content}
                </Link>
              </li>
            );
          }

          return (
            <li
              key={step.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-200/70 bg-neutral-50/80 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-950/40"
            >
              {content}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
