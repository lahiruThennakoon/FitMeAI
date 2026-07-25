import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";

/**
 * Authenticated home (Story 1.3). Guarded via DAL session lookup (AD-1 / AD-6).
 */
export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-5 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium text-brand-blue">Dashboard</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hi{user.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          You&apos;re signed in. Set your profile to get personalized daily
          targets — food logging lands in later stories.
        </p>
      </header>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Signed in as{" "}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {user.email}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/goals"
          className="brand-gradient inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-white shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          Profile & targets
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/settings"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl px-6 text-base font-medium text-brand-blue ring-1 ring-inset ring-brand-blue/30 transition hover:bg-brand-blue/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            Settings
          </Link>
          <Link
            href="/"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl px-6 text-base font-medium text-brand-blue ring-1 ring-inset ring-brand-blue/30 transition hover:bg-brand-blue/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
