import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-10 sm:max-w-lg">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(47,87,227,0.18),_transparent_65%)]"
        aria-hidden="true"
      />

      <header className="space-y-4 text-center">
        <Image
          src="/brand/logo.png"
          alt="FitMe AI"
          width={516}
          height={156}
          priority
          className="mx-auto h-auto w-56 sm:w-64"
        />
        <p className="text-balance text-base font-medium leading-snug text-neutral-800 dark:text-neutral-100">
          Log real food. Trust the numbers.
        </p>
        <p className="text-balance text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          Calories in vs burn, at a glance — calm guidance, never guilt.
        </p>
      </header>

      <section className="grid gap-3">
        <Feature emoji="🍽️" title="Effortless logging">
          Type what you ate in plain language; we do the rest.
        </Feature>
        <Feature emoji="🔎" title="Sourced, not invented">
          Every number shows where it came from — estimates are labelled.
        </Feature>
        <Feature emoji="⚡" title="Gentle, never guilt">
          A home screen that helps you choose your next move.
        </Feature>
      </section>

      <div className="flex flex-col gap-3">
        <Link
          href="/register"
          className="brand-gradient inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-white shadow-md shadow-brand-blue/25 transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-brand-teal ring-1 ring-inset ring-brand-teal/40 transition hover:bg-brand-teal/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal dark:text-teal-200"
        >
          I already have an account
        </Link>
      </div>

      <p className="text-center text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
        FitMe AI helps you track, not diagnose. Consult a professional for
        medical concerns.
      </p>
    </main>
  );
}

function Feature({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white/70 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
        <span className="mr-1.5" aria-hidden="true">
          {emoji}
        </span>
        {title}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
        {children}
      </p>
    </div>
  );
}
