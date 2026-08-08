import { AppLinkButton } from "@/components/app-button";

/** Shown on Home when targets can't be computed yet (Tier 3). */
export function ProfileSetupNudge() {
  return (
    <section
      className="rounded-2xl border border-brand-blue/30 bg-brand-blue/5 p-5 shadow-sm dark:border-brand-blue/40 dark:bg-brand-blue/10"
      aria-labelledby="profile-setup-heading"
      data-testid="profile-setup-nudge"
    >
      <h2
        id="profile-setup-heading"
        className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
      >
        Finish your profile to unlock targets
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
        Add your height, weight, and activity level so FitMe can suggest daily
        calories and macros. Country is optional.
      </p>
      <AppLinkButton href="/goals" variant="solid-blue" className="mt-4">
        Set up profile
      </AppLinkButton>
    </section>
  );
}
