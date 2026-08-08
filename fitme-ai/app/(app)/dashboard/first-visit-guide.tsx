"use client";

import { useEffect, useState } from "react";
import { AppLinkButton } from "@/components/app-button";
import {
  dismissFirstVisitGuide,
  isFirstVisitGuideDismissed,
} from "@/lib/onboarding/browser";

type Props = {
  hasProfile: boolean;
};

/**
 * Hero card for first-time Home visitors — one clear action before analytics.
 */
export function FirstVisitGuide({ hasProfile }: Props) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(isFirstVisitGuideDismissed());
  }, []);

  if (dismissed) return null;

  return (
    <section
      className="rounded-2xl border border-brand-blue/35 bg-gradient-to-br from-brand-blue/[0.12] via-white/80 to-brand-teal/[0.08] p-5 shadow-sm dark:border-brand-blue/45 dark:from-brand-blue/20 dark:via-neutral-900/70 dark:to-brand-teal/10"
      aria-labelledby="first-visit-heading"
      data-testid="first-visit-guide"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h2
            id="first-visit-heading"
            className="text-base font-semibold text-neutral-900 dark:text-neutral-50"
          >
            Welcome — let&apos;s log your first meal
          </h2>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            Describe what you ate or tap a quick staple. Takes about a minute.
            Try: &ldquo;two eggs and rice&rdquo;.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            dismissFirstVisitGuide();
            setDismissed(true);
          }}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 transition hover:bg-neutral-200/60 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          aria-label="Dismiss getting started guide"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <AppLinkButton
          href="/log"
          className="mt-0"
          data-testid="first-visit-log-cta"
        >
          Log food
        </AppLinkButton>
        {!hasProfile ? (
          <AppLinkButton
            href="/goals"
            variant="outline-brand"
            data-testid="first-visit-profile-cta"
          >
            Set up profile
          </AppLinkButton>
        ) : null}
      </div>
    </section>
  );
}
