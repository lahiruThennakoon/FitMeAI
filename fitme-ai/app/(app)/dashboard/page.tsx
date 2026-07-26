import Link from "next/link";
import { getSession } from "@/lib/dal";
import { sumExerciseKcalForUserBetween } from "@/lib/dal/exercise-entry";
import { listActiveFoodEntriesForUser } from "@/lib/dal/food-entry";
import { getGoalForUser, getProfileForUser } from "@/lib/dal/profile";
import { sumWaterMlForUserBetween } from "@/lib/dal/water-entry";
import { buildDailySummary } from "@/lib/domain/dashboard/daily-summary";
import {
  isWithinDay,
  zonedDayBounds,
} from "@/lib/domain/dashboard/day-bounds";
import { DailySummaryPanel } from "./daily-summary-panel";
import { TodayMealsList } from "./today-meals-list";
import { SignOutButton } from "../sign-out-button";

/**
 * Home dashboard (FR-15 / Stories 3.1–3.3). Day bounds use profile timezone (AD-10).
 */
export default async function DashboardPage() {
  const user = await getSession();
  const userId = user?.id;

  const [goal, profile, entries] = userId
    ? await Promise.all([
        getGoalForUser(userId),
        getProfileForUser(userId),
        listActiveFoodEntriesForUser(userId),
      ])
    : [null, null, []];

  const bounds = zonedDayBounds(new Date(), profile?.timezone ?? "UTC");
  const [todayExerciseKcal, todayWaterMl] = userId
    ? await Promise.all([
        sumExerciseKcalForUserBetween(userId, bounds.start, bounds.end),
        sumWaterMlForUserBetween(userId, bounds.start, bounds.end),
      ])
    : [0, 0];

  const todayEntries = entries.filter((e) =>
    isWithinDay(e.loggedAt, bounds),
  );

  const summary = buildDailySummary({
    dayKey: bounds.dayKey,
    entries: todayEntries,
    exerciseKcal: todayExerciseKcal,
    waterMlConsumed: todayWaterMl,
    profile,
    goal,
  });

  const todayMealRows = todayEntries.map((e) => ({
    id: e.id,
    name: e.name,
    quantity: e.quantity,
    unit: e.unit,
    mealType: e.mealType,
    loggedAt: e.loggedAt.toISOString(),
    energyKcal: e.energyKcal,
    proteinG: e.proteinG,
    carbsG: e.carbsG,
    fatG: e.fatG,
    fibreG: e.fibreG,
    sugarG: e.sugarG,
    isAiOrigin: e.aiInteractionId != null,
  }));
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
          A calm look at today — use it to decide your next move.
        </p>
      </header>

      <DailySummaryPanel summary={summary} />

      <section
        className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
        aria-label="Recent meals today"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Meals today
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">
              {summary.mealCount}
            </p>
          </div>
        </div>

        <TodayMealsList entries={todayMealRows} />
      </section>


      <nav className="flex flex-col gap-3" aria-label="Main actions">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Next actions
        </p>
        <Link
          href="/log"
          className="brand-gradient inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-white shadow-md shadow-brand-blue/25 transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          Log food
        </Link>
        <Link
          href="/exercise"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-teal/10 px-6 text-base font-medium text-brand-teal ring-1 ring-inset ring-brand-teal/40 shadow-sm shadow-brand-teal/15 transition hover:bg-brand-teal/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal dark:bg-brand-teal/15 dark:text-teal-200 dark:ring-brand-teal/50"
        >
          Log exercise
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1">
          <Link
            href="/goals"
            className="text-sm font-medium text-neutral-600 underline-offset-2 transition hover:text-neutral-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            <span aria-hidden="true">👤</span> Profile & targets
          </Link>
          <span
            className="text-neutral-300 dark:text-neutral-600"
            aria-hidden="true"
          >
            ·
          </span>
          <Link
            href="/settings"
            className="text-sm font-medium text-neutral-600 underline-offset-2 transition hover:text-neutral-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            <span aria-hidden="true">⚙️</span> Settings
          </Link>
        </div>
      </nav>

      <footer className="mt-2 flex flex-col items-start gap-1.5 border-t border-neutral-200/80 pt-5 dark:border-neutral-800">
        <p className="text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
          Signed in as{" "}
          <span className="text-neutral-500 dark:text-neutral-400">
            {user?.email}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <SignOutButton
            variant="link"
            className="text-[11px] font-medium text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
          />
          <Link
            href="/"
            className="text-[11px] font-medium text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline dark:text-neutral-500 dark:hover:text-neutral-300"
          >
            Marketing home
          </Link>
        </div>
      </footer>
    </main>
  );
}
