"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteFastingSessionAction,
  restoreFastingSessionAction,
  updateFastingSessionAction,
} from "@/app/actions/fasting";
import { DatetimeLocalField } from "@/components/datetime-local-field";
import { UndoNotice } from "@/components/undo-notice";
import type { FastingSessionDto } from "@/lib/dal/fasting-session";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/domain/datetime-local";
import { formatDurationMs } from "@/lib/domain/fasting/format";
import {
  FUTURE_TIME_MESSAGE,
  INVALID_TIME_MESSAGE,
  isFutureInstant,
} from "@/lib/domain/log-time";

type Props = {
  sessions: FastingSessionDto[];
};

const fieldClass =
  "mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

function formatWindow(session: FastingSessionDto): string {
  const start = new Date(session.startedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  if (!session.endedAt) return start;
  const startDay = new Date(session.startedAt).toDateString();
  const endDate = new Date(session.endedAt);
  /** Spell out the date on the end too when the fast crossed midnight. */
  const end = endDate.toLocaleString(
    undefined,
    endDate.toDateString() === startDay
      ? { timeStyle: "short" }
      : { dateStyle: "medium", timeStyle: "short" },
  );
  return `${start} → ${end}`;
}

/**
 * Completed fasting history with edit, soft-delete and undo (Story 7.3).
 */
export function FastingHistoryList({ sessions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removedId, setRemovedId] = useState<string | null>(null);

  const completed = sessions.filter((s) => !s.isActive);

  function onDelete(sessionId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteFastingSessionAction({ sessionId });
      if (!result.ok) {
        setError(result.error);
        setConfirmingId(null);
        return;
      }
      setConfirmingId(null);
      setRemovedId(sessionId);
      router.refresh();
    });
  }

  function onRestore(sessionId: string) {
    setError(null);
    startTransition(async () => {
      const result = await restoreFastingSessionAction({ sessionId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRemovedId(null);
      router.refresh();
    });
  }

  if (completed.length === 0) {
    return (
      <>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          No completed fasts yet — your history will show up here after you end
          one.
        </p>
        {removedId ? (
          <div className="mt-2">
            <UndoNotice
              message="Fast removed."
              onUndo={() => onRestore(removedId)}
              disabled={pending}
            />
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <ul className="divide-y divide-neutral-200/80 dark:divide-neutral-700/80">
        {completed.map((session) => (
          <HistoryRow
            key={session.id}
            session={session}
            pending={pending}
            confirming={confirmingId === session.id}
            onConfirmDelete={() => setConfirmingId(session.id)}
            onCancelDelete={() => setConfirmingId(null)}
            onDelete={() => onDelete(session.id)}
          />
        ))}
      </ul>

      {removedId ? (
        <div className="mt-2">
          <UndoNotice
            message="Fast removed."
            onUndo={() => onRestore(removedId)}
            disabled={pending}
          />
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

function HistoryRow({
  session,
  pending,
  confirming,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: {
  session: FastingSessionDto;
  pending: boolean;
  confirming: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [protocolLabel, setProtocolLabel] = useState("");
  const [notes, setNotes] = useState("");

  function startEdit() {
    setStartedAt(toDatetimeLocalValue(session.startedAt));
    setEndedAt(
      session.endedAt ? toDatetimeLocalValue(session.endedAt) : "",
    );
    setProtocolLabel(session.protocolLabel ?? "");
    setNotes(session.notes ?? "");
    setError(null);
    setEditing(true);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const start = fromDatetimeLocalValue(startedAt);
    const end = fromDatetimeLocalValue(endedAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError(INVALID_TIME_MESSAGE);
      return;
    }
    if (isFutureInstant(start) || isFutureInstant(end)) {
      setError(FUTURE_TIME_MESSAGE);
      return;
    }
    if (end.getTime() <= start.getTime()) {
      setError("End must be after the start.");
      return;
    }

    startSaving(async () => {
      const result = await updateFastingSessionAction({
        sessionId: session.id,
        startedAt: start.toISOString(),
        endedAt: end.toISOString(),
        plannedDurationMin: session.plannedDurationMin,
        protocolLabel: protocolLabel.trim() || null,
        notes: notes.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <li className="py-3 first:pt-0 last:pb-0">
        <form onSubmit={handleSave} className="space-y-3" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <DatetimeLocalField
              id={`fast-start-${session.id}`}
              label="Started"
              value={startedAt}
              onChange={setStartedAt}
              max={toDatetimeLocalValue(new Date())}
              required
            />
            <DatetimeLocalField
              id={`fast-end-${session.id}`}
              label="Ended"
              value={endedAt}
              onChange={setEndedAt}
              max={toDatetimeLocalValue(new Date())}
              required
            />
          </div>
          <div>
            <label
              htmlFor={`fast-protocol-${session.id}`}
              className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              Style
            </label>
            <input
              id={`fast-protocol-${session.id}`}
              value={protocolLabel}
              onChange={(e) => setProtocolLabel(e.target.value)}
              maxLength={40}
              className={fieldClass}
            />
          </div>
          <div>
            <label
              htmlFor={`fast-notes-${session.id}`}
              className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              Notes
            </label>
            <textarea
              id={`fast-notes-${session.id}`}
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={fieldClass}
            />
          </div>
          {error ? (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="brand-gradient inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-neutral-600 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 disabled:opacity-60 dark:text-neutral-300 dark:ring-neutral-600 dark:hover:bg-neutral-900"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  if (confirming) {
    return (
      <li
        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        data-testid="fasting-row-confirm-delete"
      >
        <span className="text-sm text-red-900 dark:text-red-100">
          Remove this {formatDurationMs(session.durationMs)} fast from history?
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onCancelDelete}
            className="rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-neutral-300"
          >
            Keep
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onDelete}
            className="rounded-lg bg-red-600 px-2.5 py-1 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Removing…" : "Remove"}
          </button>
        </span>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-white">
          {formatDurationMs(session.durationMs)}
          {session.protocolLabel ? ` · ${session.protocolLabel}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          {formatWindow(session)}
        </p>
        {session.notes ? (
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
            {session.notes}
          </p>
        ) : null}
      </div>
      <span className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={startEdit}
          className="text-xs font-medium text-brand-blue underline-offset-2 hover:underline disabled:opacity-50 dark:text-blue-400"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onConfirmDelete}
          className="text-xs font-medium text-neutral-500 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50 dark:text-neutral-400"
        >
          Remove
        </button>
      </span>
    </li>
  );
}
