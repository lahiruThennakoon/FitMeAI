"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";

type Props = {
  todayKey: string;
  yesterdayKey: string;
  selectedKey: string;
  switcherLabel: string;
  isToday: boolean;
  previousKey: string;
  nextKey: string | null;
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

/**
 * Home day control — today, yesterday, or any past day via calendar.
 * URL-driven: `/dashboard` = today, `?day=YYYY-MM-DD` = that day (not future).
 */
export function DaySwitcher({
  todayKey,
  yesterdayKey,
  selectedKey,
  switcherLabel,
  isToday,
  previousKey,
  nextKey,
}: Props) {
  const router = useRouter();
  const dateRef = useRef<HTMLInputElement>(null);

  function navigateToDay(dayKey: string) {
    if (dayKey === todayKey) {
      router.push("/dashboard");
      return;
    }
    router.push(`/dashboard?day=${dayKey}`);
  }

  function openCalendar() {
    const input = dateRef.current;
    if (!input) return;
    input.showPicker?.();
  }

  const shortcutHref = isToday ? `/dashboard?day=${yesterdayKey}` : "/dashboard";
  const shortcutLabel = isToday ? "Yesterday" : "Today";
  const shortcutAria = isToday
    ? `View yesterday, ${yesterdayKey}`
    : `Back to today, ${todayKey}`;

  return (
    <div
      className="date-navigation rounded-xl border border-neutral-200/80 bg-white/60 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900/50"
      data-testid="day-switcher"
      role="group"
      aria-label="Calendar day"
    >
      <p className="date-label text-sm font-medium text-neutral-800 dark:text-neutral-100">
        {switcherLabel}
      </p>

      <Link
        href={`/dashboard?day=${previousKey}`}
        className="date-nav-btn date-nav-btn--ghost"
        data-testid="day-switcher-prev"
        aria-label="Previous day"
      >
        ‹
      </Link>

      <div className="relative min-w-0">
        <input
          ref={dateRef}
          type="date"
          value={selectedKey}
          max={todayKey}
          onChange={(event) => {
            const next = event.target.value;
            if (next) navigateToDay(next);
          }}
          className="date-key-input sr-only"
          aria-label="Pick a day"
          tabIndex={-1}
        />
        <button
          type="button"
          onClick={openCalendar}
          className="date-nav-btn date-nav-calendar"
          data-testid="day-switcher-calendar"
          aria-label={`Open calendar, currently ${selectedKey}`}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-brand-blue dark:text-brand-teal" />
          <span className="date-nav-calendar-label">Calendar</span>
        </button>
      </div>

      {nextKey ? (
        <Link
          href={nextKey === todayKey ? "/dashboard" : `/dashboard?day=${nextKey}`}
          className="date-nav-btn date-nav-btn--ghost"
          data-testid="day-switcher-next"
          aria-label="Next day"
        >
          ›
        </Link>
      ) : (
        <span
          className="date-nav-btn date-nav-btn--ghost date-nav-btn--disabled"
          data-testid="day-switcher-next-disabled"
          aria-disabled="true"
          aria-label="Next day"
        >
          ›
        </span>
      )}

      <Link
        href={shortcutHref}
        className={`date-nav-shortcut ${
          isToday
            ? "date-nav-shortcut--link"
            : "date-nav-shortcut--today"
        }`}
        data-testid="day-switcher-shortcut"
        aria-label={shortcutAria}
      >
        {shortcutLabel}
      </Link>
    </div>
  );
}
