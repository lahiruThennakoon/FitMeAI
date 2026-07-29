import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  /** Small muted page label, e.g. "Log food". */
  eyebrow: string;
  /** Optional emoji before the title (decorative). */
  emoji?: string;
  title: string;
  description: string;
  children: ReactNode;
  /** Quiet link under content — defaults to Home. */
  backHref?: string;
  backLabel?: string;
};

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12.5 15 7.5 10l5-5" />
    </svg>
  );
}

/**
 * Shared authenticated page chrome — matches Home (gradient, type scale, back).
 */
export function AppPageShell({
  eyebrow,
  emoji,
  title,
  description,
  children,
  backHref = "/dashboard",
  backLabel = "Home",
}: Props) {
  return (
    <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-5 py-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(47,87,227,0.18),_transparent_65%)]"
        aria-hidden="true"
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={backHref}
            className="inline-flex h-8 items-center gap-0.5 rounded-lg border border-neutral-200/80 bg-white/70 px-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-900/80"
            aria-label={`Back to ${backLabel}`}
          >
            <ChevronLeftIcon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            {backLabel}
          </Link>
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {eyebrow}
          </span>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            {emoji ? (
              <span className="mr-2" aria-hidden="true">
                {emoji}
              </span>
            ) : null}
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {description}
          </p>
        </div>
      </header>

      {children}
    </main>
  );
}
