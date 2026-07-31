"use client";

import { useEffect, useRef, useState } from "react";
import {
  clampDatetimeLocal,
  getCalendarCells,
  getNowDatetimeLocal,
  HOURS_12,
  MINUTE_OPTIONS,
  monthLabel,
  parseDatetimeLocalParts,
  setDatetimeLocalDate,
  setDatetimeLocalTime,
  shiftMonth,
  to12Hour,
} from "@/lib/domain/datetime-local";

type Props = {
  label: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSet: () => void;
  onClose: () => void;
  max?: string;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      {direction === "left" ? (
        <path d="M12.5 15 7.5 10l5-5" />
      ) : (
        <path d="M7.5 5 12.5 10l-5 5" />
      )}
    </svg>
  );
}

function TimeColumn({
  label,
  values,
  selected,
  formatValue,
  onSelect,
}: {
  label: string;
  values: readonly (number | string)[];
  selected: number | string;
  formatValue: (value: number | string) => string;
  onSelect: (value: number | string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <div className="datetime-picker-time-column">
      <p className="datetime-picker-time-column-label">{label}</p>
      <div ref={listRef} className="datetime-picker-time-list" role="listbox" aria-label={label}>
        {values.map((value) => {
          const isSelected = value === selected;
          return (
            <button
              key={String(value)}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(value)}
              className={
                isSelected
                  ? "datetime-picker-time-option datetime-picker-time-option--selected"
                  : "datetime-picker-time-option"
              }
            >
              {formatValue(value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DatetimeLocalPickerPopover({
  label,
  draft,
  onDraftChange,
  onSet,
  onClose,
  max,
}: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const parts = parseDatetimeLocalParts(draft);
  const initial = parts ?? {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  };
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const selectedDate = parts
    ? `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
    : "";
  const { hour12, period } = parts
    ? to12Hour(parts.hour)
    : to12Hour(new Date().getHours());
  const selectedMinute = parts?.minute ?? 0;

  useEffect(() => {
    const nextParts = parseDatetimeLocalParts(draft);
    if (nextParts) {
      setViewYear(nextParts.year);
      setViewMonth(nextParts.month);
    }
  }, [draft]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (popoverRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-datetime-picker-trigger]")) return;
      onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [onClose]);

  function updateDraft(next: string) {
    onDraftChange(max ? clampDatetimeLocal(next, max) : next);
  }

  function selectDate(dateValue: string) {
    const base = draft || getNowDatetimeLocal(max);
    updateDraft(setDatetimeLocalDate(base, dateValue));
  }

  function selectTime(hour: number, minute: number, nextPeriod: "AM" | "PM") {
    const base = draft || getNowDatetimeLocal(max);
    updateDraft(setDatetimeLocalTime(base, hour, minute, nextPeriod));
  }

  function onClear() {
    onDraftChange("");
  }

  function onToday() {
    onDraftChange(getNowDatetimeLocal(max));
  }

  const cells = getCalendarCells(viewYear, viewMonth, max);
  const nextMonth = shiftMonth(viewYear, viewMonth, 1);
  const nextMonthStart = `${nextMonth.year}-${String(nextMonth.month).padStart(2, "0")}-01`;
  const canGoForward = !max || nextMonthStart <= max.slice(0, 10);

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`Choose ${label}`}
      className="datetime-picker-popover"
      data-testid="datetime-local-picker"
    >
      <footer className="datetime-picker-footer">
        <button type="button" className="datetime-picker-footer-btn" onClick={onClear}>
          Clear
        </button>
        <button type="button" className="datetime-picker-footer-btn" onClick={onToday}>
          Today
        </button>
        <button
          type="button"
          className="datetime-picker-footer-btn datetime-picker-footer-btn--primary"
          onClick={onSet}
        >
          Set
        </button>
      </footer>

      <div className="datetime-picker-body">
        <section className="datetime-picker-calendar" aria-label="Date">
          <div className="datetime-picker-month-header">
            <button
              type="button"
              className="datetime-picker-icon-btn"
              aria-label="Previous month"
              onClick={() => {
                const next = shiftMonth(viewYear, viewMonth, -1);
                setViewYear(next.year);
                setViewMonth(next.month);
              }}
            >
              <ChevronIcon direction="left" />
            </button>
            <p className="datetime-picker-month-label">{monthLabel(viewYear, viewMonth)}</p>
            <button
              type="button"
              className="datetime-picker-icon-btn"
              aria-label="Next month"
              disabled={!canGoForward}
              onClick={() => {
                const next = shiftMonth(viewYear, viewMonth, 1);
                setViewYear(next.year);
                setViewMonth(next.month);
              }}
            >
              <ChevronIcon direction="right" />
            </button>
          </div>

          <div className="datetime-picker-weekdays" aria-hidden="true">
            {WEEKDAYS.map((day) => (
              <span key={day} className="datetime-picker-weekday">
                {day}
              </span>
            ))}
          </div>

          <div className="datetime-picker-days" role="grid" aria-label="Calendar days">
            {cells.map((cell) => {
              const isSelected = cell.dateValue === selectedDate;
              return (
                <button
                  key={cell.key}
                  type="button"
                  role="gridcell"
                  disabled={cell.disabled}
                  aria-selected={isSelected}
                  aria-label={cell.dateValue}
                  onClick={() => selectDate(cell.dateValue)}
                  className={
                    isSelected
                      ? "datetime-picker-day datetime-picker-day--selected"
                      : cell.inMonth
                        ? "datetime-picker-day"
                        : "datetime-picker-day datetime-picker-day--muted"
                  }
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </section>

        <section className="datetime-picker-time" aria-label="Time">
          <TimeColumn
            label="Hour"
            values={HOURS_12}
            selected={hour12}
            formatValue={(value) => String(value).padStart(2, "0")}
            onSelect={(value) => selectTime(Number(value), selectedMinute, period)}
          />
          <TimeColumn
            label="Minute"
            values={MINUTE_OPTIONS}
            selected={selectedMinute}
            formatValue={(value) => String(value).padStart(2, "0")}
            onSelect={(value) => selectTime(hour12, Number(value), period)}
          />
          <TimeColumn
            label="Period"
            values={["AM", "PM"]}
            selected={period}
            formatValue={(value) => String(value)}
            onSelect={(value) => selectTime(hour12, selectedMinute, value as "AM" | "PM")}
          />
        </section>
      </div>
    </div>
  );
}
