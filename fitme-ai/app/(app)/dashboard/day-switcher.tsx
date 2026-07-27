import Link from "next/link";

type Props = {
  todayKey: string;
  yesterdayKey: string;
  selectedKey: string;
  isToday: boolean;
};

/**
 * Today / yesterday Home day control (Story 5.4).
 * URL-driven: `/dashboard` = today, `?day=YYYY-MM-DD` = yesterday when allowed.
 */
export function DaySwitcher({
  todayKey,
  yesterdayKey,
  selectedKey,
  isToday,
}: Props) {
  const label = isToday ? `Today · ${todayKey}` : `Yesterday · ${selectedKey}`;

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-white/60 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900/50"
      data-testid="day-switcher"
      role="group"
      aria-label="Calendar day"
    >
      <p className="min-w-0 text-sm font-medium text-neutral-800 dark:text-neutral-100">
        {label}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        {isToday ? (
          <Link
            href={`/dashboard?day=${yesterdayKey}`}
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand-blue transition hover:bg-brand-blue/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue dark:text-blue-400"
            aria-label={`View yesterday, ${yesterdayKey}`}
          >
            Yesterday
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="rounded-lg bg-brand-blue/10 px-2.5 py-1.5 text-sm font-medium text-brand-blue transition hover:bg-brand-blue/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue dark:text-blue-300"
            aria-label={`Back to today, ${todayKey}`}
          >
            Today
          </Link>
        )}
      </div>
    </div>
  );
}
