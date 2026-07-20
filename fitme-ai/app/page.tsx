import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-10 sm:max-w-lg">
      <header className="space-y-4 text-center">
        <Image
          src="/brand/logo.png"
          alt="FitMe AI"
          width={516}
          height={156}
          priority
          className="mx-auto h-auto w-56 sm:w-64"
        />
        <span className="inline-flex items-center rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-medium text-brand-blue ring-1 ring-brand-blue/20">
          Accuracy-first
        </span>
        <p className="text-balance text-sm text-neutral-600 dark:text-neutral-400">
          Log your real food in seconds, and trust the numbers. Calories in vs.
          out, at a glance.
        </p>
      </header>

      <section className="grid gap-3">
        <Feature title="Effortless logging">
          Type what you ate in plain language; we do the rest.
        </Feature>
        <Feature title="Sourced, not invented">
          Every number shows where it came from — estimates are clearly labelled.
        </Feature>
        <Feature title="Gentle, never guilt">
          A dashboard that nudges you to your next good choice.
        </Feature>
      </section>

      <div className="flex flex-col gap-3">
        <Link
          href="/register"
          className="brand-gradient inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-white shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-brand-blue ring-1 ring-inset ring-brand-blue/30 transition hover:bg-brand-blue/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          I already have an account
        </Link>
      </div>

      <p className="text-center text-xs text-neutral-500 dark:text-neutral-500">
        FitMe AI helps you track, not diagnose. Consult a professional for
        medical concerns.
      </p>
    </main>
  );
}

function Feature({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {children}
      </p>
    </div>
  );
}
