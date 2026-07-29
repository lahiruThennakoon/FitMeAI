"use client";

import { useRef } from "react";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  hideLabel?: boolean;
  compact?: boolean;
  /** `datetime-local` bound, e.g. today's value to block future entries. */
  max?: string;
};

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function DatetimeLocalField({
  id,
  label,
  value,
  onChange,
  required,
  className,
  hideLabel = false,
  compact = false,
  max,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        /* Unsupported or blocked outside a user gesture */
      }
    }
  }

  const inputClassName = compact
    ? "datetime-local-input w-full rounded-lg border border-neutral-300 bg-white py-1.5 pl-2 pr-10 text-sm dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
    : "datetime-local-input w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 pr-11 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

  return (
    <div className={className}>
      {hideLabel ? null : (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
        >
          {label}
        </label>
      )}
      <div className={compact && hideLabel ? "relative" : "relative mt-1"}>
        <input
          ref={inputRef}
          id={id}
          type="datetime-local"
          required={required}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClassName}
        />
        <button
          type="button"
          onClick={openPicker}
          aria-label={`Open calendar for ${label}`}
          className={
            compact
              ? "absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-brand-blue dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-brand-teal"
              : "absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-brand-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-brand-teal"
          }
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
