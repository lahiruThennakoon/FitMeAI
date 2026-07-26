import type { BaselineBurnResult } from "@/lib/domain/burn/baseline";

type Props = {
  burn: BaselineBurnResult;
  intakeKcal: number;
  exerciseKcal?: number;
  netKcal: number;
};

function fmt(v: number): string {
  return `${Math.round(v)} kcal`;
}

/**
 * Baseline Burn + net with formula transparency (FR-13).
 */
export function BaselineBurnPanel({
  burn,
  intakeKcal,
  exerciseKcal = 0,
  netKcal,
}: Props) {
  const activityLabel = burn.activityLevel.replaceAll("_", " ");

  return (
    <section
      className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
      aria-label="Baseline burn and net calories"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Energy balance
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-neutral-600 dark:text-neutral-300">
            Baseline Burn
          </dt>
          <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">
            {fmt(burn.baselineBurnKcal)}
          </dd>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            per day · estimate
          </p>
        </div>
        <div>
          <dt className="text-sm text-neutral-600 dark:text-neutral-300">
            Net calories
          </dt>
          <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">
            {netKcal > 0 ? `+${fmt(netKcal)}` : fmt(netKcal)}
          </dd>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            in − (burn + exercise)
          </p>
        </div>
      </dl>

      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
        Today&apos;s food: {fmt(intakeKcal)} · Exercise:{" "}
        {exerciseKcal > 0
          ? `${fmt(exerciseKcal)} (estimate)`
          : "0 kcal (none logged)"}
      </p>

      {burn.usedDefaultActivity ? (
        <p
          className="mt-2 text-sm text-amber-800 dark:text-amber-200"
          role="status"
        >
          Activity level was missing — using sedentary ({burn.activityMultiplier}
          ×) until you set one in Profile.
        </p>
      ) : null}

      <details className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-700">
        <summary className="cursor-pointer text-sm font-medium text-neutral-800 dark:text-neutral-200">
          How Baseline Burn is calculated
        </summary>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          <p>
            BMR (Mifflin–St Jeor): {burn.bmrKcal} kcal — {burn.formulaBmr}
          </p>
          <p>
            Baseline Burn = TDEE: {burn.formulaTdee} · activity{" "}
            <span className="font-medium">{activityLabel}</span> (
            {burn.activityMultiplier}×) → {fmt(burn.baselineBurnKcal)}
          </p>
          <p>{burn.limitation}</p>
        </div>
      </details>
    </section>
  );
}
