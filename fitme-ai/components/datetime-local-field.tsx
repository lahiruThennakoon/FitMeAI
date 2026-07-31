"use client";

import { useId, useRef, useState } from "react";
import { DatetimeLocalPickerPopover } from "@/components/datetime-local-picker-popover";
import {
  formatDatetimeLocalDisplay,
  getNowDatetimeLocal,
} from "@/lib/domain/datetime-local";

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
  const pickerId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const triggerClassName = compact
    ? "datetime-local-trigger datetime-local-trigger--compact"
    : "datetime-local-trigger";

  const calendarButtonClassName = compact
    ? "datetime-local-calendar-btn datetime-local-calendar-btn--compact"
    : "datetime-local-calendar-btn";

  function openPicker() {
    setDraft(value || getNowDatetimeLocal(max));
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
  }

  function commitDraft() {
    onChange(draft);
    closePicker();
  }

  const displayValue = formatDatetimeLocalDisplay(value);

  return (
    <div className={className} ref={rootRef}>
      {hideLabel ? null : (
        <label
          htmlFor={`${id}-trigger`}
          className="block text-xs font-medium text-neutral-600 dark:text-neutral-300"
        >
          {label}
        </label>
      )}

      <div className={compact && hideLabel ? "relative" : "relative mt-1"}>
        <input
          id={id}
          name={id}
          type="datetime-local"
          required={required}
          max={max}
          value={value}
          onChange={() => {}}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />

        <button
          type="button"
          id={`${id}-trigger`}
          data-datetime-picker-trigger
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? pickerId : undefined}
          onClick={openPicker}
          className={triggerClassName}
        >
          <span className={displayValue ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400 dark:text-neutral-500"}>
            {displayValue || "Pick date and time"}
          </span>
        </button>

        <button
          type="button"
          data-datetime-picker-trigger
          onClick={openPicker}
          aria-label={`Open calendar for ${label}`}
          className={calendarButtonClassName}
        >
          <CalendarIcon className="h-4 w-4" />
        </button>

        {open ? (
          <div id={pickerId} className="datetime-picker-anchor">
            <DatetimeLocalPickerPopover
              label={label}
              draft={draft}
              onDraftChange={setDraft}
              onSet={commitDraft}
              onClose={closePicker}
              max={max}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
