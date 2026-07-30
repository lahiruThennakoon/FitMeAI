"use client";

import { useEffect, useRef, useTransition } from "react";
import { saveAppearancePreferenceAction } from "@/app/actions/appearance";
import { useAppearance } from "@/components/theme-provider";
import type { AppearancePreference } from "@/lib/domain/appearance/types";

const OPTIONS: { value: AppearancePreference; label: string }[] = [
  { value: "system", label: "Match system" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

type Props = {
  /** When false, only localStorage applies (no profile row yet). */
  canSyncProfile?: boolean;
};

export function AppearanceControl({ canSyncProfile = true }: Props) {
  const { appearance, setAppearance } = useAppearance();
  const [pending, startTransition] = useTransition();
  const profileSyncedRef = useRef(false);

  useEffect(() => {
    if (!canSyncProfile || profileSyncedRef.current) return;
    profileSyncedRef.current = true;
    startTransition(async () => {
      await saveAppearancePreferenceAction({ appearancePreference: appearance });
    });
  }, [canSyncProfile, appearance]);

  function select(next: AppearancePreference) {
    if (next === appearance) return;
    setAppearance(next);
    if (!canSyncProfile) return;
    startTransition(async () => {
      await saveAppearancePreferenceAction({ appearancePreference: next });
    });
  }

  return (
    <div className="space-y-2">
      <span
        id="appearance-label"
        className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
      >
        Appearance
      </span>
      <div
        role="radiogroup"
        aria-labelledby="appearance-label"
        className="flex gap-1 rounded-xl bg-neutral-200/80 p-1 dark:bg-neutral-800/80"
      >
        {OPTIONS.map(({ value, label }) => {
          const selected = appearance === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={pending}
              onClick={() => select(value)}
              className={`h-11 flex-1 rounded-lg px-2 text-sm font-medium transition disabled:opacity-60 ${
                selected
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-100"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Uses your device setting when on Match system. Charts and macro colors
        keep the same meaning in every mode.
      </p>
    </div>
  );
}
