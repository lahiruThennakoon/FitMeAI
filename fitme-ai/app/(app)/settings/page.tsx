import Link from "next/link";
import { getSession } from "@/lib/dal";
import { SignOutButton } from "../sign-out-button";
import { DeleteAccountForm } from "./delete-account-form";

export default async function SettingsPage() {
  const user = await getSession();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-5 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium text-brand-blue">Settings</p>
        <h1 className="text-2xl font-semibold tracking-tight">Account & privacy</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Manage your account. Units, export, and consent controls arrive in later
          stories.
        </p>
      </header>

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Signed in
        </h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {user?.email}
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </section>

      <section
        aria-labelledby="danger-zone-heading"
        className="rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/50 dark:bg-red-950/20"
      >
        <h2
          id="danger-zone-heading"
          className="text-base font-semibold text-red-800 dark:text-red-300"
        >
          Danger zone
        </h2>
        <p className="mt-1 text-sm text-red-700/90 dark:text-red-300/80">
          Permanently delete your account and all associated personal data.
        </p>
        <div className="mt-5">
          <DeleteAccountForm />
        </div>
      </section>

      <Link
        href="/dashboard"
        className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-brand-blue ring-1 ring-inset ring-brand-blue/30 transition hover:bg-brand-blue/5"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
