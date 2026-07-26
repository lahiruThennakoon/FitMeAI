import { getSession } from "@/lib/dal";
import { AppPageShell } from "@/components/app-page-shell";
import { SignOutButton } from "../sign-out-button";
import { DeleteAccountForm } from "./delete-account-form";

export default async function SettingsPage() {
  const user = await getSession();

  return (
    <AppPageShell
      eyebrow="Settings"
      emoji="⚙️"
      title="Account & privacy"
      description="Manage your account. Units, export, and consent controls arrive in later stories."
    >
      <section className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Signed in
        </h2>
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">
          {user?.email}
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </section>

      <section
        aria-labelledby="danger-zone-heading"
        className="rounded-2xl border border-red-300/50 bg-red-50/70 p-5 dark:border-red-800/50 dark:bg-red-950/25"
      >
        <h2
          id="danger-zone-heading"
          className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300"
        >
          Danger zone
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-red-800/90 dark:text-red-200/80">
          Permanently delete your account and all associated personal data.
        </p>
        <div className="mt-5">
          <DeleteAccountForm />
        </div>
      </section>
    </AppPageShell>
  );
}
