import Link from "next/link";
import { getSession } from "@/lib/dal";
import { sumExerciseKcalForUserBetween } from "@/lib/dal/exercise-entry";
import { listActiveFoodEntriesForUser } from "@/lib/dal/food-entry";
import { getGoalForUser, getProfileForUser } from "@/lib/dal/profile";
import {
  computeBaselineBurn,
  computeNetCalories,
} from "@/lib/domain/burn/baseline";
import { BaselineBurnPanel } from "./baseline-burn-panel";
import { SignOutButton } from "../sign-out-button";

function startOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfNextLocalDay(d = new Date()): Date {
  const next = startOfLocalDay(d);
  next.setDate(next.getDate() + 1);
  return next;
}

function fmtKcal(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${Math.round(v)} kcal`;
}

/**
 * Authenticated home (Story 1.3). Baseline Burn on dashboard (Story 3.1 / FR-13).
 * Route group layout enforces session (AD-1 / AD-6).
 */
export default async function DashboardPage() {
  const user = await getSession();
  const userId = user?.id;

  const dayStart = startOfLocalDay();
  const dayEnd = startOfNextLocalDay();

  const [goal, profile, entries, todayExerciseKcal] = userId
    ? await Promise.all([
        getGoalForUser(userId),
        getProfileForUser(userId),
        listActiveFoodEntriesForUser(userId),
        sumExerciseKcalForUserBetween(userId, dayStart, dayEnd),
      ])
    : [null, null, [], 0];

  const todayEntries = entries.filter((e) => e.loggedAt >= dayStart);
  const todayKcal = todayEntries.reduce(
    (sum, e) => sum + (e.energyKcal ?? 0),
    0,
  );
  const targetKcal = goal?.caloriesKcal ?? null;
  const recent = todayEntries.slice(0, 4);

  const baseline = profile
    ? computeBaselineBurn({
        weightG: profile.currentWeightG,
        heightCm: profile.heightCm,
        ageYears: profile.ageYears,
        sex: profile.sex,
        activityLevel: profile.activityLevel,
      })
    : null;

  const netKcal =
    baseline != null
      ? computeNetCalories({
          intakeKcal: todayKcal,
          baselineBurnKcal: baseline.baselineBurnKcal,
          exerciseKcal: todayExerciseKcal,
        })
      : null;

  const displayName = user?.name?.trim() || "there";

  return (
    <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-5 py-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(47,87,227,0.18),_transparent_65%)]"
        aria-hidden="true"
      />

      <header className="space-y-2">
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Home
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
          Hi, {displayName}
        </h1>
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          Log a meal in plain language, or check your daily energy balance.
        </p>
      </header>

      <section
        className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
        aria-label="Today at a glance"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Today
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-neutral-900 dark:text-white">
              {todayEntries.length === 0 ? "—" : fmtKcal(todayKcal)}
            </p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {targetKcal != null
                ? `of ${fmtKcal(targetKcal)} target`
                : "No calorie target yet — set one in Profile"}
            </p>
          </div>
          <p className="text-right text-sm text-neutral-600 dark:text-neutral-300">
            <span className="block text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">
              {todayEntries.length}
            </span>
            {todayEntries.length === 1 ? "meal logged" : "meals logged"}
          </p>
        </div>

        {recent.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            {recent.map((e) => (
              <li
                key={e.id}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                  {e.name}
                </span>
                <span className="shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">
                  {fmtKcal(e.energyKcal)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 border-t border-neutral-200 pt-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
            Nothing logged today yet. Start with a quick meal description.
          </p>
        )}
      </section>

      {baseline && netKcal != null ? (
        <BaselineBurnPanel
          burn={baseline}
          intakeKcal={todayKcal}
          exerciseKcal={todayExerciseKcal}
          netKcal={netKcal}
        />
      ) : (
        <section
          className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 p-5 dark:border-neutral-600 dark:bg-neutral-900/40"
          aria-label="Baseline burn unavailable"
        >
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Baseline Burn needs a profile
          </p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            Add your weight, height, age, sex, and activity level so we can
            estimate daily burn (Mifflin–St Jeor) even with no exercise logged.
          </p>
          <Link
            href="/goals"
            className="mt-3 inline-flex text-sm font-medium text-brand-blue underline-offset-2 hover:underline"
          >
            Set up Profile & targets
          </Link>
        </section>
      )}

      <nav className="flex flex-col gap-3" aria-label="Main actions">
        <Link
          href="/log"
          className="brand-gradient inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-white shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          Log food
        </Link>
        <Link
          href="/exercise"
          className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-neutral-900 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue dark:text-white dark:ring-neutral-500 dark:hover:bg-neutral-900"
        >
          Log exercise
        </Link>
        <Link
          href="/goals"
          className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-neutral-900 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue dark:text-white dark:ring-neutral-500 dark:hover:bg-neutral-900"
        >
          Profile & targets
        </Link>
        <Link
          href="/settings"
          className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-neutral-900 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue dark:text-white dark:ring-neutral-500 dark:hover:bg-neutral-900"
        >
          Settings
        </Link>
      </nav>

      <footer className="flex flex-col items-start gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Signed in as{" "}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {user?.email}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <SignOutButton variant="link" />
          <Link
            href="/"
            className="text-sm font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-300 dark:hover:text-white"
          >
            Marketing home
          </Link>
        </div>
      </footer>
    </main>
  );
}
