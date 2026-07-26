import type { BaselineBurnResult } from "@/lib/domain/burn/baseline";
import { describeEnergyBalance } from "@/lib/domain/dashboard/daily-summary";
import { BaselineBurnCalcDetails } from "@/components/formula-disclosure";
import { DeviationMark } from "./deviation-mark";
import { EnergyBalanceChart } from "./energy-balance-chart";

type Props = {
  burn: BaselineBurnResult;
  intakeKcal: number;
  exerciseKcal?: number;
  netKcal: number;
};

/**
 * Standalone energy panel (FR-13) — same hero as the dashboard card.
 */
export function BaselineBurnPanel({
  burn,
  intakeKcal,
  exerciseKcal = 0,
  netKcal,
}: Props) {
  const balance = describeEnergyBalance(netKcal);
  const isOver = balance.kind === "over";

  const shell = isOver
    ? "border-red-300/50 dark:border-red-800/50"
    : balance.kind === "under"
      ? "border-brand-green/35 dark:border-brand-green/45"
      : "border-brand-teal/35 dark:border-brand-teal/45";

  const chip = isOver
    ? "bg-red-500/15 text-red-800 dark:text-red-200"
    : balance.kind === "under"
      ? "bg-brand-green/20 text-emerald-800 dark:text-emerald-200"
      : "bg-brand-teal/20 text-teal-900 dark:text-teal-200";

  return (
    <section
      className={`rounded-2xl border bg-white/70 p-5 shadow-sm dark:bg-neutral-900/60 ${shell}`}
      aria-label="Today's energy"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-green/20 text-[10px] text-brand-green"
            aria-hidden="true"
          >
            ⚡
          </span>
          Today’s energy
        </p>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip}`}
        >
          {isOver ? (
            <DeviationMark
              kind="up"
              label={balance.statusLabel}
              size="sm"
              alert
            />
          ) : null}
          {balance.statusLabel}
        </span>
      </div>

      <EnergyBalanceChart
        intakeKcal={intakeKcal}
        baselineBurnKcal={burn.baselineBurnKcal}
        exerciseKcal={exerciseKcal}
        balance={balance}
      />

      {burn.usedDefaultActivity ? (
        <p
          className="mt-2 text-[10px] leading-snug text-amber-800 dark:text-amber-200"
          role="status"
        >
          Activity level was missing — using sedentary ({burn.activityMultiplier}
          ×) until you set one in Profile.
        </p>
      ) : null}

      <BaselineBurnCalcDetails burn={burn} />
    </section>
  );
}
