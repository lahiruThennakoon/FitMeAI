"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveNotificationPreferencesAction } from "@/app/actions/profile";

type Props = {
  notifyFastingEnd: boolean;
  notifyWeeklyDigest: boolean;
};

export function NotificationPreferencesForm({
  notifyFastingEnd,
  notifyWeeklyDigest,
}: Props) {
  const router = useRouter();
  const [fastingEnd, setFastingEnd] = useState(notifyFastingEnd);
  const [weeklyDigest, setWeeklyDigest] = useState(notifyWeeklyDigest);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty =
    fastingEnd !== notifyFastingEnd || weeklyDigest !== notifyWeeklyDigest;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await saveNotificationPreferencesAction({
        notifyFastingEnd: fastingEnd,
        notifyWeeklyDigest: weeklyDigest,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        Reminders are saved now; push and email delivery will follow in a later
        release. Nothing is sent yet.
      </p>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={fastingEnd}
          disabled={pending}
          onChange={(e) => setFastingEnd(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
        />
        <span className="text-sm text-neutral-800 dark:text-neutral-100">
          Notify when a planned fast ends
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={weeklyDigest}
          disabled={pending}
          onChange={(e) => setWeeklyDigest(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
        />
        <span className="text-sm text-neutral-800 dark:text-neutral-100">
          Weekly progress summary
        </span>
      </label>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {saved && !dirty ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
          Preferences saved.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !dirty}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-blue px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save reminders"}
      </button>
    </form>
  );
}
