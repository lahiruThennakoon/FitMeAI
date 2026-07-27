"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  endFastingSessionAction,
  startFastingSessionAction,
} from "@/app/actions/fasting";
import type { FastingSessionDto } from "@/lib/dal/fasting-session";
import { formatDurationMs } from "@/lib/domain/fasting/format";

type Props = {
  active: FastingSessionDto | null;
};

const PROTOCOL_PRESETS = ["16:8", "18:6", "OMAD", "custom"] as const;

/**
 * Start / end fasting session (Story 7.1).
 * Calm copy — ending early is fine; this is a clock, not a verdict.
 */
export function FastingControl({ active }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<string>("16:8");
  const [customLabel, setCustomLabel] = useState("");
  const [plannedHours, setPlannedHours] = useState("16");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const elapsedMs = active
    ? Math.max(0, now - new Date(active.startedAt).getTime())
    : 0;

  function onStart(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const hours = Number(plannedHours);
    const plannedDurationMin =
      Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : null;
    const protocolLabel =
      protocol === "custom" ? customLabel.trim() || "custom" : protocol;

    startTransition(async () => {
      const result = await startFastingSessionAction({
        plannedDurationMin,
        protocolLabel,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Fast started — you've got this at your own pace.");
      router.refresh();
    });
  }

  function onEnd() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await endFastingSessionAction(
        active ? { sessionId: active.id } : {},
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        `Fast ended · ${formatDurationMs(result.data.session.durationMs)}. Nice work logging it.`,
      );
      router.refresh();
    });
  }

  if (active) {
    return (
      <section
        className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
        aria-label="Active fast"
        data-testid="fasting-active"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Fasting now
          {active.protocolLabel ? ` · ${active.protocolLabel}` : ""}
        </p>
        <p
          className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-white"
          aria-live="polite"
        >
          {formatDurationMs(elapsedMs)}
        </p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Started{" "}
          {new Date(active.startedAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          {active.plannedDurationMin
            ? ` · planned ${Math.round(active.plannedDurationMin / 60)}h`
            : ""}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          This is a personal timer — not medical advice. End whenever you need
          to.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={onEnd}
          className="brand-gradient mt-4 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Ending…" : "End fast"}
        </button>
        {error ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200" role="status">
            {message}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
      aria-label="Start a fast"
      data-testid="fasting-start"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Ready when you are
      </p>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
        Start a timer for your fasting window. You can end it anytime — no
        judgment.
      </p>

      <form onSubmit={onStart} className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="protocol"
            className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
          >
            Style (optional)
          </label>
          <select
            id="protocol"
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          >
            {PROTOCOL_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {protocol === "custom" ? (
          <div>
            <label
              htmlFor="custom-protocol"
              className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              Custom name
            </label>
            <input
              id="custom-protocol"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              maxLength={40}
              className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </div>
        ) : null}

        <div>
          <label
            htmlFor="planned-hours"
            className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
          >
            Planned hours (optional)
          </label>
          <input
            id="planned-hours"
            type="number"
            inputMode="decimal"
            min={1}
            max={168}
            step={1}
            value={plannedHours}
            onChange={(e) => setPlannedHours(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="brand-gradient inline-flex h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Starting…" : "Start fast"}
        </button>
      </form>

      <p className="mt-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        Personal timer only — not medical advice. If you&apos;re unsure about
        fasting, check with a clinician.
      </p>

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
