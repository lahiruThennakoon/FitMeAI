import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  children: ReactNode;
  /** Footer disclaimer — defaults to the product safety line. */
  disclaimer?: string | null;
};

/**
 * Shared auth chrome — logo, gradient wash, soft form card, quiet disclaimer.
 */
export function AuthPageShell({
  title,
  description,
  children,
  disclaimer = "FitMe AI helps you track, not diagnose. Consult a professional for medical concerns.",
}: Props) {
  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-10 sm:max-w-lg">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(47,87,227,0.18),_transparent_65%)]"
        aria-hidden="true"
      />

      <header className="space-y-3 text-center">
        <Link href="/" className="inline-block transition hover:opacity-90">
          <Image
            src="/brand/logo.png"
            alt="FitMe AI"
            width={516}
            height={156}
            priority
            className="mx-auto h-auto w-48 sm:w-56"
          />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
          {title}
        </h1>
        <p className="text-balance text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          {description}
        </p>
      </header>

      <div className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60">
        {children}
      </div>

      {disclaimer ? (
        <p className="text-center text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
          {disclaimer}
        </p>
      ) : null}
    </main>
  );
}
