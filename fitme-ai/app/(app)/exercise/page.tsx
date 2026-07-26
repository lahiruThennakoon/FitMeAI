import Link from "next/link";
import { getSession } from "@/lib/dal";
import { getProfileForUser } from "@/lib/dal/profile";
import { gToKg } from "@/lib/domain/targets/units";
import { ExerciseForm } from "./exercise-form";

/**
 * Manual exercise logging (Story 3.2 / FR-14).
 */
export default async function ExercisePage() {
  const user = await getSession();
  const profile = user ? await getProfileForUser(user.id) : null;
  const weightKg = profile ? gToKg(profile.currentWeightG) : null;

  return (
    <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-5 py-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(47,87,227,0.14),_transparent_65%)]"
        aria-hidden="true"
      />

      <header className="space-y-2">
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          <Link
            href="/dashboard"
            className="underline-offset-2 hover:underline"
          >
            Home
          </Link>
          <span aria-hidden="true"> · </span>
          Exercise
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
          Log a workout
        </h1>
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          Add type, duration, and intensity. Calorie burn is an estimate — not
          an exact measurement.
        </p>
      </header>

      <ExerciseForm weightKg={weightKg} />
    </main>
  );
}
