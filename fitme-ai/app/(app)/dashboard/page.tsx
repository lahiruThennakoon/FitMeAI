import Link from "next/link";
import { getSession } from "@/lib/dal";
import {
  listActiveExerciseEntriesForUser,
  sumExerciseKcalForUserBetween,
} from "@/lib/dal/exercise-entry";
import { listActiveFoodEntriesForUser } from "@/lib/dal/food-entry";
import { getGoalForUser, getProfileForUser } from "@/lib/dal/profile";
import {
  listWaterEntriesForUserBetween,
  sumWaterMlForUserBetween,
} from "@/lib/dal/water-entry";
import { getActiveFastingSession } from "@/lib/dal/fasting-session";
import { getLatestGlucoseEntry } from "@/lib/dal/glucose-entry";
import { buildDailySummary } from "@/lib/domain/dashboard/daily-summary";
import {
  isWithinDay,
  nextZonedDayKey,
  previousZonedDayKey,
  resolveHomeDaySelection,
} from "@/lib/domain/dashboard/day-bounds";
import { gToKg } from "@/lib/domain/targets/units";
import { DailySummaryPanel } from "./daily-summary-panel";
import { DaySwitcher } from "./day-switcher";
import { TodayExercisesList } from "./today-exercises-list";
import { TodayMealsList } from "./today-meals-list";
import { FastingStatusChip } from "./fasting-status-chip";
import { GlucoseGlance } from "./glucose-glance";
import { ProfileSetupNudge } from "./profile-setup-nudge";
import { SignOutButton } from "../sign-out-button";

type PageProps = {
  searchParams?: Promise<{ day?: string | string[] }>;
};

/**
 * Home dashboard (FR-15 / Stories 3.1–3.3, 5.1–5.4).
 * Day bounds use profile timezone (AD-10); `?day=` selects any past day (not future).
 */
export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await getSession();
  const userId = user?.id;
  const params = searchParams ? await searchParams : {};
  const rawDay = params.day;
  const requestedDay = Array.isArray(rawDay) ? rawDay[0] : rawDay;

  const [goal, profile, entries, exerciseEntries, activeFast, latestGlucose] =
    userId
    ? await Promise.all([
        getGoalForUser(userId),
        getProfileForUser(userId),
        listActiveFoodEntriesForUser(userId),
        listActiveExerciseEntriesForUser(userId),
        getActiveFastingSession(userId),
        getLatestGlucoseEntry(userId),
      ])
    : [null, null, [], [], null, null];

  const now = new Date();
  const selection = resolveHomeDaySelection({
    now,
    timeZone: profile?.timezone ?? "UTC",
    requestedDay,
  });
  const { bounds, todayKey, yesterdayKey, isToday, labels } = selection;
  const timeZone = profile?.timezone ?? "UTC";
  const previousKey = previousZonedDayKey(bounds.dayKey, timeZone);
  const nextKey = isToday ? null : nextZonedDayKey(bounds.dayKey, timeZone);

  const [dayExerciseKcal, dayWaterMl, dayWaterEntries] = userId
    ? await Promise.all([
        sumExerciseKcalForUserBetween(userId, bounds.start, bounds.end),
        sumWaterMlForUserBetween(userId, bounds.start, bounds.end),
        listWaterEntriesForUserBetween(userId, bounds.start, bounds.end),
      ])
    : [0, 0, []];

  /**
   * Quick-adds while viewing a past day are stamped at that day's local midday
   * — safely inside its bounds and never in the future.
   */
  const waterLogAtIso = isToday
    ? null
    : new Date(bounds.start.getTime() + 12 * 60 * 60 * 1000).toISOString();

  const dayEntries = entries.filter((e) => isWithinDay(e.loggedAt, bounds));
  const dayExerciseRows = exerciseEntries.filter((e) =>
    isWithinDay(new Date(e.performedAt), bounds),
  );
  const weightKg = profile ? gToKg(profile.currentWeightG) : null;
  const dayExerciseMinutes = dayExerciseRows.reduce(
    (sum, e) => sum + e.durationMin,
    0,
  );

  const summary = buildDailySummary({
    dayKey: bounds.dayKey,
    entries: dayEntries,
    exerciseKcal: dayExerciseKcal,
    exerciseMinutes: dayExerciseMinutes,
    waterMlConsumed: dayWaterMl,
    profile,
    goal,
  });

  const mealRows = dayEntries.map((e) => ({
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
    sodiumMg: e.sodiumMg,
    note: e.note,
    isAiOrigin: e.aiInteractionId != null,
  }));
  const displayName = user?.name?.trim() || "there";
  const mealsHeading = labels.mealsHeading;
  const exerciseHeading = labels.exerciseHeading;

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
        <p
          className="dashboard-helper-text text-sm leading-relaxed text-neutral-600 dark:text-neutral-300"
          data-testid="dashboard-header-blurb"
        >
          {labels.headerBlurb}
        </p>
      </header>

      {!profile ? <ProfileSetupNudge /> : null}

      <DaySwitcher
        todayKey={todayKey}
        yesterdayKey={yesterdayKey}
        selectedKey={bounds.dayKey}
        switcherLabel={labels.switcherLabel}
        isToday={isToday}
        previousKey={previousKey}
        nextKey={nextKey}
      />

      <DailySummaryPanel
        summary={summary}
        labels={labels}
        waterEntries={dayWaterEntries}
        waterLogAtIso={waterLogAtIso}
      />

      {activeFast ? (
        <FastingStatusChip active={activeFast} nowMs={now.getTime()} />
      ) : null}

      {isToday ? (
        <GlucoseGlance
          latest={latestGlucose}
          displayUnit={profile?.preferredGlucoseUnit ?? "mg_dl"}
        />
      ) : null}

      <section
        className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
        aria-label={mealsHeading}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {mealsHeading}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">
              {summary.mealCount}
            </p>
          </div>
        </div>

        <TodayMealsList entries={mealRows} labels={labels} />
      </section>

      <section
        className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
        aria-label={exerciseHeading}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {exerciseHeading}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">
              {dayExerciseRows.length}
            </p>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            estimates
          </p>
        </div>

        <TodayExercisesList
          entries={dayExerciseRows}
          weightKg={weightKg}
          labels={labels}
          units={profile?.preferredUnits ?? "metric"}
        />
      </section>

      <nav className="flex flex-col gap-3" aria-label="Main actions">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Next actions
        </p>
        {!isToday ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Logging always goes to{" "}
            <Link
              href="/dashboard"
              className="font-medium text-brand-blue underline-offset-2 hover:underline"
            >
              today
            </Link>
            .
          </p>
        ) : null}
        <Link
          href="/log"
          className="brand-gradient inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-white shadow-md shadow-brand-blue/25 transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          Log food
        </Link>
        <Link
          href="/exercise"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-teal/10 px-6 text-base font-medium text-brand-teal ring-1 ring-inset ring-brand-teal/40 shadow-sm shadow-brand-teal/15 transition hover:bg-brand-teal/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal dark:bg-brand-teal/15 dark:text-teal-200 dark:ring-brand-teal/50 dark:hover:bg-brand-teal/20"
        >
          Log exercise
        </Link>
        <Link
          href="/fasting"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-neutral-900/5 px-6 text-base font-medium text-neutral-800 ring-1 ring-inset ring-neutral-300/80 shadow-sm transition hover:bg-neutral-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue dark:bg-neutral-100/5 dark:text-neutral-100 dark:ring-neutral-600 dark:hover:bg-neutral-100/10"
        >
          Fasting timer
        </Link>
        <Link
          href="/glucose"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-neutral-900/5 px-6 text-base font-medium text-neutral-800 ring-1 ring-inset ring-neutral-300/80 shadow-sm transition hover:bg-neutral-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue dark:bg-neutral-100/5 dark:text-neutral-100 dark:ring-neutral-600 dark:hover:bg-neutral-100/10"
        >
          Log glucose
        </Link>
        <Link
          href="/progress"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-teal/10 px-6 text-base font-medium text-brand-teal ring-1 ring-inset ring-brand-teal/40 shadow-sm transition hover:bg-brand-teal/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal dark:bg-brand-teal/15 dark:text-teal-200 dark:hover:bg-brand-teal/20"
        >
          Progress charts
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
