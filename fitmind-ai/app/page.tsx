import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-10 sm:max-w-lg">
      <header className="space-y-3 text-center">
        <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-600/20 dark:bg-teal-950/40 dark:text-teal-300">
          Accuracy-first
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          FitMind AI
        </h1>
        <p className="text-balance text-sm text-neutral-600 dark:text-neutral-400">
          Log your real food — Sri Lankan meals included — in seconds, and trust
          the numbers. Calories in vs. out, at a glance.
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
          className="inline-flex h-12 items-center justify-center rounded-xl bg-teal-600 px-6 text-base font-medium text-white transition hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-teal-700 ring-1 ring-inset ring-teal-600/30 transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:text-teal-300 dark:hover:bg-teal-950/30"
        >
          I already have an account
        </Link>
      </div>

      <p className="text-center text-xs text-neutral-500 dark:text-neutral-500">
        Not a medical device. Estimates are not medical advice.
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
