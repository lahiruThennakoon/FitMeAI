"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { endFastingSessionAction } from "@/app/actions/fasting";
import type { FastingSessionDto } from "@/lib/dal/fasting-session";
import { formatDurationMs, staleFastNudge } from "@/lib/domain/fasting/format";

type Props = {
  active: FastingSessionDto;
  /** Server render instant, so the first client render matches the HTML. */
  nowMs: number;
};

/** Home glance chip for an active fast (Story 7.4). */
export function FastingStatusChip({ active, nowMs }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(nowMs);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsedMs = Math.max(0, now - new Date(active.startedAt).getTime());
  const plannedMs = active.plannedDurationMin
    ? active.plannedDurationMin * 60 * 1000
    : null;
  const progressPct =
    plannedMs && plannedMs > 0
      ? Math.min(100, Math.round((elapsedMs / plannedMs) * 100))
      : null;
  const staleNudge = staleFastNudge(elapsedMs);

  function onEnd() {
    setError(null);
    startTransition(async () => {
      const result = await endFastingSessionAction({ sessionId: active.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section
      className="rounded-2xl border border-brand-blue/25 bg-brand-blue/5 p-4 shadow-sm dark:border-brand-blue/35 dark:bg-brand-blue/10"
      aria-label="Active fast"
      data-testid="fasting-status-chip"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-brand-blue dark:text-blue-300">
        Fasting now
        {active.protocolLabel ? ` · ${active.protocolLabel}` : ""}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">
        {formatDurationMs(elapsedMs)}
      </p>
      {progressPct != null ? (
        <div className="mt-2">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-brand-blue/15"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Planned fast progress"
          >
            <div
              className="h-full rounded-full bg-brand-blue transition-[width] duration-1000 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {progressPct}% of planned window
          </p>
        </div>
      ) : null}

      {staleNudge ? (
        <p className="mt-2 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
          {staleNudge}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={onEnd}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-blue px-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Ending…" : "End fast"}
        </button>
        <Link
          href="/fasting"
          className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-brand-blue underline-offset-2 transition hover:bg-brand-blue/10 hover:underline dark:text-blue-300 dark:hover:bg-brand-blue/20"
        >
          Open timer
        </Link>
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
