import type { DailySummary } from "@/lib/domain/dashboard/daily-summary";

type Props = {
  summary: DailySummary;
};

function fmt(v: number, unit: string): string {
  return `${Math.round(v)} ${unit}`;
}

function ProgressBar({
  label,
  consumed,
  target,
  ratio,
  unit,
}: {
  label: string;
  consumed: number;
  target: number | null;
  ratio: number | null;
  unit: string;
}) {
  const pct = ratio == null ? 0 : Math.round(ratio * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-neutral-800 dark:text-neutral-100">
          {label}
        </span>
        <span className="tabular-nums text-neutral-600 dark:text-neutral-300">
          {fmt(consumed, unit)}
          {target != null ? (
            <span className="text-neutral-400 dark:text-neutral-500">
              {" "}
              / {fmt(target, unit)}
            </span>
          ) : null}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={target != null ? pct : undefined}
        aria-label={`${label} progress`}
      >
        <div
          className="h-full rounded-full bg-brand-blue transition-[width] duration-500"
          style={{ width: target != null ? `${pct}%` : "0%" }}
        />
      </div>
    </div>
  );
}

/**
 * Full daily summary: calories, remaining, macros, water, net (FR-15).
 */
export function DailySummaryPanel({ summary }: Props) {
  const net = summary.netKcal;
  const remaining = summary.remainingKcal;

  return (
    <section
      className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
      aria-label="Daily nutrition summary"
      data-testid="daily-summary"
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Today · {summary.dayKey}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          {summary.supportiveMessage}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-neutral-500 dark:text-neutral-400">
            Consumed
          </dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">
            {summary.intakeKcal} kcal
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500 dark:text-neutral-400">
            Target
          </dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">
            {summary.targetKcal != null ? `${summary.targetKcal} kcal` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500 dark:text-neutral-400">
            Remaining
          </dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">
            {remaining == null
              ? "—"
              : remaining >= 0
                ? `${remaining} kcal`
                : `${remaining} kcal`}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500 dark:text-neutral-400">
            Exercise
          </dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">
            {summary.exerciseKcal} kcal
          </dd>
          <p className="text-[11px] text-neutral-500">estimate</p>
        </div>
      </dl>

      {summary.baseline && net != null ? (
        <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/80 px-3 py-3 dark:border-neutral-700 dark:bg-neutral-950/40">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Net calories
              </p>
              <p className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">
                {net > 0 ? `+${net}` : net} kcal
              </p>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Burn baseline {summary.baseline.baselineBurnKcal} kcal/day
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Intake is shown above. Add a profile to unlock Baseline Burn and net
          calories.
        </p>
      )}

      <div className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
          Macros
        </p>
        {summary.progress.map((p) => (
          <ProgressBar
            key={p.key}
            label={p.label}
            consumed={p.consumed}
            target={p.target}
            ratio={p.ratio}
            unit={p.unit}
          />
        ))}
      </div>

      <div className="border-t border-neutral-200 pt-3 dark:border-neutral-700">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
          Water
        </p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          {summary.waterMlTarget != null
            ? `Target ${summary.waterMlTarget} ml · logging water lands next — this is your daily aim.`
            : "Set a water target in Profile when you like."}
        </p>
      </div>
    </section>
  );
}
