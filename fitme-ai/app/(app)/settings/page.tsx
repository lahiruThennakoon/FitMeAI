import Link from "next/link";
import { getSession } from "@/lib/dal";
import { getProfileForUser } from "@/lib/dal/profile";
import { AppPageShell } from "@/components/app-page-shell";
import { SignOutButton } from "../sign-out-button";
import { ChangeEmailForm } from "./change-email-form";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountForm } from "./delete-account-form";
import { DisplayPreferencesForm } from "./display-preferences-form";
import { ExportData } from "./export-data";
import { NotificationPreferencesForm } from "./notification-preferences-form";

export default async function SettingsPage() {
  const user = await getSession();
  const profile = user ? await getProfileForUser(user.id) : null;

  return (
    <AppPageShell
      eyebrow="Settings"
      emoji="⚙️"
      title="Account & privacy"
      description="Units, timezone, sign-in details, and a full copy of your data."
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
        aria-labelledby="display-preferences-heading"
        className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
      >
        <h2
          id="display-preferences-heading"
          className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
        >
          Units & timezone
        </h2>
        {profile ? (
          <div className="mt-4">
            <DisplayPreferencesForm
              preferredUnits={profile.preferredUnits}
              preferredGlucoseUnit={profile.preferredGlucoseUnit}
              timezone={profile.timezone}
            />
          </div>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Set up your{" "}
            <Link
              href="/goals"
              className="font-medium text-brand-blue underline decoration-dotted"
            >
              profile
            </Link>{" "}
            first — units and timezone are saved alongside it.
          </p>
        )}
      </section>

      {profile ? (
        <section
          aria-labelledby="notification-preferences-heading"
          className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
        >
          <h2
            id="notification-preferences-heading"
            className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
          >
            Reminders
          </h2>
          <div className="mt-4">
            <NotificationPreferencesForm
              notifyFastingEnd={profile.notifyFastingEnd}
              notifyWeeklyDigest={profile.notifyWeeklyDigest}
            />
          </div>
        </section>
      ) : null}

      {user ? (
        <section
          aria-labelledby="sign-in-heading"
          className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
        >
          <h2
            id="sign-in-heading"
            className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
          >
            Sign-in details
          </h2>
          <div className="mt-4 space-y-6">
            <ChangePasswordForm />
            <div className="border-t border-neutral-200/80 pt-6 dark:border-neutral-700">
              <ChangeEmailForm currentEmail={user.email} />
            </div>
          </div>
        </section>
      ) : null}

      <section
        aria-labelledby="export-heading"
        className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
      >
        <h2
          id="export-heading"
          className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
        >
          Your data
        </h2>
        <div className="mt-4">
          <ExportData />
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
