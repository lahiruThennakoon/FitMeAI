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
  backLabel = "← Home",
}: Props) {
  return (
    <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-5 py-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(47,87,227,0.18),_transparent_65%)]"
        aria-hidden="true"
      />

      <header className="space-y-2">
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          <Link
            href={backHref}
            className="underline-offset-2 transition hover:text-neutral-800 hover:underline dark:hover:text-neutral-200"
          >
            {backLabel}
          </Link>
          <span aria-hidden="true"> · </span>
          {eyebrow}
        </p>
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
      </header>

      {children}
    </main>
  );
}
