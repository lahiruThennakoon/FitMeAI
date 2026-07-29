"use client";

type Props = {
  message: string;
  onUndo: () => void;
  disabled?: boolean;
  /** Verb shown on the action — "Undo" unless a clearer word fits. */
  actionLabel?: string;
};

/**
 * Inline confirmation for a reversible removal. Removals in FitMe are
 * soft-deletes, so the honest thing is to say so and offer the way back
 * instead of a scary "gone forever" prompt.
 */
export function UndoNotice({
  message,
  onUndo,
  disabled = false,
  actionLabel = "Undo",
}: Props) {
  return (
    <p
      className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300"
      role="status"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onUndo}
        disabled={disabled}
        className="rounded-md px-1.5 py-0.5 font-medium text-brand-blue underline-offset-2 transition hover:bg-brand-blue/10 hover:underline disabled:opacity-50 dark:text-blue-400 dark:hover:bg-brand-blue/20"
      >
        {actionLabel}
      </button>
    </p>
  );
}
