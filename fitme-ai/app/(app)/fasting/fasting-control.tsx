"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  discardActiveFastAction,
  endFastingSessionAction,
  logPastFastAction,
  startFastingSessionAction,
  updateFastingSessionAction,
} from "@/app/actions/fasting";
import { DatetimeLocalField } from "@/components/datetime-local-field";
import { AppButton } from "@/components/app-button";
import { useLogToast } from "@/components/log-toast-provider";
import { btnClass } from "@/lib/ui/buttons";
import type { FastingSessionDto } from "@/lib/dal/fasting-session";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/domain/datetime-local";
import { formatDurationMs, staleFastNudge } from "@/lib/domain/fasting/format";
import {
  FUTURE_TIME_MESSAGE,
  INVALID_TIME_MESSAGE,
  isFutureInstant,
} from "@/lib/domain/log-time";

type Props = {
  active: FastingSessionDto | null;
  /** Server timestamp so the first client render matches the server HTML. */
  nowMs: number;
};

const PROTOCOL_PRESETS = ["16:8", "18:6", "OMAD", "custom"] as const;

const fieldClass =
  "mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

/** Resolve a datetime-local value to a past instant, or an error message. */
function resolvePastInstant(
  value: string,
): { ok: true; iso: string } | { ok: false; error: string } {
  const at = fromDatetimeLocalValue(value);
  if (Number.isNaN(at.getTime())) {
    return { ok: false, error: INVALID_TIME_MESSAGE };
  }
  if (isFutureInstant(at)) return { ok: false, error: FUTURE_TIME_MESSAGE };
  return { ok: true, iso: at.toISOString() };
}

/**
 * Start / end fasting session (Story 7.1).
 * Calm copy — ending early is fine; this is a clock, not a verdict.
 */
export function FastingControl({ active, nowMs }: Props) {
  const router = useRouter();
  const { showLogToast } = useLogToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<string>("16:8");
  const [customLabel, setCustomLabel] = useState("");
  const [plannedHours, setPlannedHours] = useState("16");
  const [startedAtInput, setStartedAtInput] = useState("");
  const [mode, setMode] = useState<"start" | "past">("start");
  const [pastStart, setPastStart] = useState("");
  const [pastEnd, setPastEnd] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [adjustStart, setAdjustStart] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [now, setNow] = useState(nowMs);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const elapsedMs = active
    ? Math.max(0, now - new Date(active.startedAt).getTime())
    : 0;
  const staleNudge = active ? staleFastNudge(elapsedMs) : null;

  function onStart(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const hours = Number(plannedHours);
    const plannedDurationMin =
      Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : null;
    const protocolLabel =
      protocol === "custom" ? customLabel.trim() || "custom" : protocol;

    let startedAtIso: string | undefined;
    if (startedAtInput) {
      const resolved = resolvePastInstant(startedAtInput);
      if (!resolved.ok) {
        setError(resolved.error);
        return;
      }
      startedAtIso = resolved.iso;
    }

    startTransition(async () => {
      const result = await startFastingSessionAction({
        plannedDurationMin,
        protocolLabel,
        startedAt: startedAtIso,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showLogToast("Fast started — you've got this at your own pace.");
      setStartedAtInput("");
      router.refresh();
    });
  }

  function onLogPast(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const start = resolvePastInstant(pastStart);
    if (!start.ok) {
      setError(start.error);
      return;
    }
    const end = resolvePastInstant(pastEnd);
    if (!end.ok) {
      setError(end.error);
      return;
    }

    const hours = Number(plannedHours);
    const protocolLabel =
      protocol === "custom" ? customLabel.trim() || "custom" : protocol;

    startTransition(async () => {
      const result = await logPastFastAction({
        startedAt: start.iso,
        endedAt: end.iso,
        plannedDurationMin:
          Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : null,
        protocolLabel,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showLogToast(
        `Logged · ${formatDurationMs(result.data.session.durationMs)}. Added to your history.`,
      );
      setPastStart("");
      setPastEnd("");
      router.refresh();
    });
  }

  function startAdjust() {
    if (!active) return;
    setAdjustStart(toDatetimeLocalValue(active.startedAt));
    setAdjustNotes(active.notes ?? "");
    setError(null);
    setAdjusting(true);
  }

  function onSaveAdjust(event: React.FormEvent) {
    event.preventDefault();
    if (!active) return;
    setError(null);

    const start = resolvePastInstant(adjustStart);
    if (!start.ok) {
      setError(start.error);
      return;
    }

    startTransition(async () => {
      const result = await updateFastingSessionAction({
        sessionId: active.id,
        startedAt: start.iso,
        endedAt: null,
        plannedDurationMin: active.plannedDurationMin,
        protocolLabel: active.protocolLabel,
        notes: adjustNotes.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAdjusting(false);
      showLogToast("Updated.");
      router.refresh();
    });
  }

  function onDiscard() {
    if (!active) return;
    setError(null);
    startTransition(async () => {
      const result = await discardActiveFastAction({ sessionId: active.id });
      if (!result.ok) {
        setError(result.error);
        setConfirmingDiscard(false);
        return;
      }
      setConfirmingDiscard(false);
      showLogToast("Fast discarded — nothing was added to your history.");
      router.refresh();
    });
  }

  function onEnd() {
    setError(null);
    startTransition(async () => {
      const result = await endFastingSessionAction(
        active ? { sessionId: active.id } : {},
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showLogToast(
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
        {active.plannedDurationMin && active.plannedDurationMin > 0 ? (
          <div className="mt-3">
            {(() => {
              const plannedMs = active.plannedDurationMin * 60 * 1000;
              const pct = Math.min(
                100,
                Math.round((elapsedMs / plannedMs) * 100),
              );
              return (
                <>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-brand-blue/15"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Planned fast progress"
                  >
                    <div
                      className="h-full rounded-full bg-brand-blue transition-[width] duration-1000 ease-linear"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {pct}% of planned window
                  </p>
                </>
              );
            })()}
          </div>
        ) : null}
        {staleNudge ? (
          <p
            className="mt-3 rounded-xl border border-amber-300/70 bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100"
            data-testid="fasting-stale-nudge"
          >
            {staleNudge}
          </p>
        ) : null}

        {active.notes ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
            {active.notes}
          </p>
        ) : null}

        <p className="mt-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          This is a personal timer — not medical advice. End whenever you need
          to.
        </p>

        {adjusting ? (
          <form
            onSubmit={onSaveAdjust}
            className="mt-4 space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-700 dark:bg-neutral-800/50"
            noValidate
          >
            <DatetimeLocalField
              id="fasting-adjust-start"
              label="Actually started at"
              value={adjustStart}
              onChange={setAdjustStart}
              max={toDatetimeLocalValue(new Date())}
              required
            />
            <div>
              <label
                htmlFor="fasting-adjust-notes"
                className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Notes
              </label>
              <textarea
                id="fasting-adjust-notes"
                rows={2}
                maxLength={500}
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={pending}
                className={btnClass("primary", { size: "sm" })}
              >
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setAdjusting(false)}
                className={btnClass("secondary", { size: "sm", className: "px-3" })}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {confirmingDiscard ? (
          <div
            className="mt-4 rounded-xl border border-red-200/80 bg-red-50/60 p-3 dark:border-red-900/50 dark:bg-red-950/20"
            data-testid="fasting-confirm-discard"
          >
            <p className="text-sm text-red-900 dark:text-red-100">
              Discard this fast? It won&rsquo;t be saved to your history.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmingDiscard(false)}
                className="rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-neutral-300"
              >
                Keep fasting
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onDiscard}
                className="rounded-lg bg-red-600 px-2.5 py-1 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Discarding…" : "Discard"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <AppButton type="button" disabled={pending} onClick={onEnd}>
            {pending ? "Ending…" : "End fast"}
          </AppButton>
          {adjusting ? null : (
            <AppButton
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={startAdjust}
            >
              Adjust start time
            </AppButton>
          )}
          {confirmingDiscard ? null : (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmingDiscard(true)}
              className={btnClass("secondary", {
                className:
                  "bg-transparent shadow-none ring-0 text-neutral-500 underline-offset-2 hover:bg-transparent hover:underline hover:text-red-600 dark:text-neutral-400 dark:hover:bg-transparent dark:hover:text-red-300",
              })}
            >
              Discard
            </button>
          )}
        </div>
        {error ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
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
        {mode === "start"
          ? "Start a timer for your fasting window. You can end it anytime — no judgment."
          : "Already finished a fast? Add it with the times you remember."}
      </p>

      <div
        className="mt-3 flex gap-2"
        role="group"
        aria-label="Fasting entry mode"
      >
        <button
          type="button"
          onClick={() => setMode("start")}
          aria-pressed={mode === "start"}
          className="choice-pill"
        >
          Start now
        </button>
        <button
          type="button"
          onClick={() => setMode("past")}
          aria-pressed={mode === "past"}
          className="choice-pill"
        >
          Log a past fast
        </button>
      </div>

      <form
        onSubmit={mode === "start" ? onStart : onLogPast}
        className="mt-4 space-y-3"
        noValidate
      >
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

        {mode === "start" ? (
          <DatetimeLocalField
            id="fasting-started-at"
            label="Started at (optional)"
            value={startedAtInput || toDatetimeLocalValue(new Date())}
            onChange={setStartedAtInput}
            max={toDatetimeLocalValue(new Date())}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <DatetimeLocalField
              id="fasting-past-start"
              label="Started"
              value={pastStart}
              onChange={setPastStart}
              max={toDatetimeLocalValue(new Date())}
              required
            />
            <DatetimeLocalField
              id="fasting-past-end"
              label="Ended"
              value={pastEnd}
              onChange={setPastEnd}
              max={toDatetimeLocalValue(new Date())}
              required
            />
          </div>
        )}

        <AppButton type="submit" disabled={pending} block>
          {mode === "start"
            ? pending
              ? "Starting…"
              : "Start fast"
            : pending
              ? "Saving…"
              : "Log this fast"}
        </AppButton>
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
    </section>
  );
}
