import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { getGoalForUser, getProfileForUser } from "@/lib/dal/profile";
import { GoalsForm } from "./goals-form";

export default async function GoalsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const [profile, goal] = await Promise.all([
    getProfileForUser(user.id),
    getGoalForUser(user.id),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-5 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium text-brand-blue">Goals</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile ? "Edit your profile & targets" : "Set up your profile"}
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          We&apos;ll suggest daily targets from your details using a published
          formula you can see and adjust.
        </p>
      </header>

      <GoalsForm initialProfile={profile} initialGoal={goal} />

      <Link
        href="/dashboard"
        className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-brand-blue ring-1 ring-inset ring-brand-blue/30"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
