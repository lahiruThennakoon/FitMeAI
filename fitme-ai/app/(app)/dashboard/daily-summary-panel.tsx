import type { BaselineBurnResult } from "@/lib/domain/burn/baseline";
import {
  describeEnergyBalance,
  type DailySummary,
  type MacroProgress,
} from "@/lib/domain/dashboard/daily-summary";
import { BaselineBurnCalcDetails } from "@/components/formula-disclosure";
import { displayWater } from "@/lib/domain/targets/units";
import { DeviationMark, deviationKind } from "./deviation-mark";
import { EnergyBalanceChart } from "./energy-balance-chart";
import { WaterLogControl } from "./water-log-control";

type Props = {
  summary: DailySummary;
};

function fmt(v: number, unit: string): string {
  return `${Math.round(v)} ${unit}`;
}

/** Soft macro accents from the brand family — readable, not neon. */
const MACRO_THEME: Record<
  MacroProgress["key"],
  { fill: string; track: string; glow: string; chip: string }
> = {
  calories: {
    fill: "bg-brand-blue",
    track: "bg-brand-blue/15 dark:bg-brand-blue/25",
    glow: "shadow-[0_0_12px_rgba(47,87,227,0.35)]",
    chip: "text-brand-blue bg-brand-blue/10",
  },
  proteinG: {
    fill: "bg-brand-teal",
    track: "bg-brand-teal/15 dark:bg-brand-teal/25",
    glow: "shadow-[0_0_12px_rgba(14,165,165,0.35)]",
    chip: "text-brand-teal bg-brand-teal/10",
  },
  carbsG: {
    fill: "bg-sky-500",
    track: "bg-sky-500/15 dark:bg-sky-500/25",
    glow: "shadow-[0_0_12px_rgba(14,165,233,0.3)]",
    chip: "text-sky-700 bg-sky-500/10 dark:text-sky-300",
  },
  fatG: {
    fill: "bg-amber-500",
    track: "bg-amber-500/15 dark:bg-amber-500/25",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]",
    chip: "text-amber-800 bg-amber-500/10 dark:text-amber-200",
  },
  fibreG: {
    fill: "bg-brand-green",
    track: "bg-brand-green/15 dark:bg-brand-green/25",
    glow: "shadow-[0_0_12px_rgba(34,179,107,0.35)]",
    chip: "text-emerald-700 bg-brand-green/10 dark:text-emerald-300",
  },
  sugarG: {
    fill: "bg-rose-400",
    track: "bg-rose-400/15 dark:bg-rose-400/25",
    glow: "shadow-[0_0_10px_rgba(251,113,133,0.28)]",
    chip: "text-rose-700 bg-rose-400/10 dark:text-rose-300",
  },
};

function ProgressBar({
  label,
  consumed,
  target,
  ratio,
  unit,
  themeKey,
}: {
  label: string;
  consumed: number;
  target: number | null;
  ratio: number | null;
  unit: string;
  themeKey: MacroProgress["key"];
}) {
  const pct = ratio == null ? 0 : Math.round(ratio * 100);
  const barPct = Math.min(100, pct);
  const theme = MACRO_THEME[themeKey];
  const hasFill = target != null && barPct > 0;
  const isOver =
    target != null && consumed > target * 1.02;
  const fillClass = isOver
    ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
    : theme.fill;
  const glowClass = isOver
    ? ""
    : hasFill
      ? theme.glow
      : "";

  return (
    <div className="rounded-xl border border-neutral-200/70 bg-white/80 px-3 py-2.5 shadow-sm dark:border-neutral-700/80 dark:bg-neutral-950/50">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold ${theme.chip}`}
        >
          {label}
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums text-neutral-600 dark:text-neutral-300">
          {isOver ? (
            <DeviationMark
              kind="up"
              label={`${label} over daily aim`}
              size="sm"
              alert
            />
          ) : null}
          {target != null ? (
            <>
              <span className="font-medium text-neutral-800 dark:text-neutral-100">
                {Math.round(consumed)}
              </span>
              <span className="text-neutral-400 dark:text-neutral-500">
                of {Math.round(target)} {unit}
              </span>
            </>
          ) : (
            fmt(consumed, unit)
          )}
        </span>
      </div>
      <div
        className={`mt-2 h-2.5 overflow-hidden rounded-full ${theme.track}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={target != null ? barPct : undefined}
        aria-label={`${label} progress`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${fillClass} ${glowClass}`}
          style={{ width: target != null ? `${barPct}%` : "0%" }}
        />
      </div>
    </div>
  );
}

/**
 * Today’s energy — ring hero + Food / Burn rows (mock-inspired, calm copy).
 */
function EnergyBalanceCard({
  intakeKcal,
  exerciseKcal,
  burn,
  netKcal,
}: {
  intakeKcal: number;
  exerciseKcal: number;
  burn: BaselineBurnResult;
  netKcal: number;
}) {
  const balance = describeEnergyBalance(netKcal);
  const isOver = balance.kind === "over";

  const shell = isOver
    ? "border-red-300/50 bg-red-50/80 dark:border-red-800/50 dark:bg-red-950/25"
    : balance.kind === "under"
      ? "border-brand-green/35 bg-brand-green/[0.08] dark:border-brand-green/45 dark:bg-brand-green/10"
      : "border-brand-teal/30 bg-brand-teal/[0.08] dark:border-brand-teal/40 dark:bg-brand-teal/10";

  const chip = isOver
    ? "bg-red-500/15 text-red-800 dark:text-red-200"
    : balance.kind === "under"
      ? "bg-brand-green/20 text-emerald-800 dark:text-emerald-200"
      : "bg-brand-teal/20 text-teal-900 dark:text-teal-200";

  return (
    <div
      className={`rounded-xl border px-3 py-3.5 ${shell}`}
      data-testid="energy-balance"
      aria-label={`Today's energy: ${balance.statusLabel}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
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
    </div>
  );
}

/**
 * Full daily summary: calories, remaining, macros, water, net (FR-15).
 */
export function DailySummaryPanel({ summary }: Props) {
  const net = summary.netKcal;
  const remaining = summary.remainingKcal;
  /** Remaining: positive = under target (↓), negative = over (↑). */
  const remainingKind =
    remaining == null
      ? null
      : remaining === 0
        ? ("even" as const)
        : remaining > 0
          ? ("down" as const)
          : ("up" as const);
  const intakeVsTarget =
    summary.targetKcal != null
      ? deviationKind(summary.intakeKcal, summary.targetKcal, 50)
      : null;

  const isOverWater = summary.waterMlConsumed > summary.waterMlTarget * 1.02;
  const waterBarPct = Math.min(
    100,
    summary.waterMlTarget > 0
      ? Math.round((summary.waterMlConsumed / summary.waterMlTarget) * 100)
      : 0,
  );
  /** Display-only unit conversion; storage/progress math stays canonical ml (AD-11). */
  const waterUnit = summary.preferredUnits === "imperial" ? "fl oz" : "ml";
  const waterConsumedDisplay = displayWater(
    summary.waterMlConsumed,
    summary.preferredUnits,
  );
  const waterTargetDisplay = displayWater(
    summary.waterMlTarget,
    summary.preferredUnits,
  );

  const remainingTone =
    remaining == null
      ? "border-neutral-200/80 bg-neutral-50/80 dark:border-neutral-700 dark:bg-neutral-950/40"
      : remaining >= 200
        ? "border-brand-teal/30 bg-brand-teal/[0.08] dark:border-brand-teal/40 dark:bg-brand-teal/10"
        : remaining >= 0
          ? "border-brand-blue/25 bg-brand-blue/[0.06] dark:border-brand-blue/35 dark:bg-brand-blue/10"
          : "border-amber-300/50 bg-amber-50/80 dark:border-amber-700/50 dark:bg-amber-950/30";

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

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200/70 bg-white/90 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-950/40">
          <dt className="text-xs text-neutral-500 dark:text-neutral-400">
            Consumed
          </dt>
          <dd className="mt-0.5 inline-flex items-center gap-1.5 text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">
            {intakeVsTarget === "up" ? (
              <DeviationMark
                kind="up"
                label="Consumed over target"
                size="md"
                alert
              />
            ) : null}
            {summary.intakeKcal}{" "}
            <span className="text-sm font-medium text-neutral-500">kcal</span>
          </dd>
        </div>
        <div className="rounded-xl border border-neutral-200/70 bg-white/90 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-950/40">
          <dt className="text-xs text-neutral-500 dark:text-neutral-400">
            Target
          </dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">
            {summary.targetKcal != null ? (
              <>
                {summary.targetKcal}{" "}
                <span className="text-sm font-medium text-neutral-500">
                  kcal
                </span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className={`rounded-xl border px-3 py-2.5 ${remainingTone}`}>
          <dt className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Remaining
          </dt>
          <dd className="mt-0.5 inline-flex items-center gap-1.5 text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">
            {remaining == null ? (
              "—"
            ) : (
              <>
                {remainingKind === "up" ? (
                  <DeviationMark
                    kind="up"
                    label="Over daily target"
                    size="md"
                    alert
                  />
                ) : null}
                {Math.abs(remaining)}{" "}
                <span className="text-sm font-medium text-neutral-500">
                  kcal
                  {remaining < 0 ? " over" : remaining > 0 ? " left" : ""}
                </span>
              </>
            )}
          </dd>
        </div>
        <div className="rounded-xl border border-brand-teal/25 bg-brand-teal/[0.06] px-3 py-2.5 dark:border-brand-teal/35 dark:bg-brand-teal/10">
          <dt className="text-xs font-medium text-brand-teal">
            <span aria-hidden="true">🔥</span> Exercise
          </dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">
            {summary.exerciseKcal}{" "}
            <span className="text-sm font-medium text-neutral-500">kcal</span>
          </dd>
          <p className="text-[11px] text-neutral-500">estimate</p>
        </div>
      </dl>

      {summary.baseline && net != null ? (
        <EnergyBalanceCard
          intakeKcal={summary.intakeKcal}
          exerciseKcal={summary.exerciseKcal}
          burn={summary.baseline}
          netKcal={net}
        />
      ) : (
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Intake is shown above. Add a profile to unlock Baseline Burn and net
          calories.
        </p>
      )}

      <div className="space-y-2.5 border-t border-neutral-200 pt-4 dark:border-neutral-700">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
          Macros
        </p>
        <div className="grid gap-2.5">
          {summary.progress.map((p) => (
            <ProgressBar
              key={p.key}
              label={p.label}
              consumed={p.consumed}
              target={p.target}
              ratio={p.ratio}
              unit={p.unit}
              themeKey={p.key}
            />
          ))}
        </div>
      </div>

      <div
        className="rounded-xl border border-sky-200/60 bg-sky-50/70 px-3 py-3 dark:border-sky-900/50 dark:bg-sky-950/25"
        data-testid="water-card"
      >
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-sky-900 dark:text-sky-100">
            <span aria-hidden="true">💧</span> Water
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums text-sky-900/80 dark:text-sky-200/80">
            {isOverWater ? (
              <DeviationMark
                kind="up"
                label="Past daily water aim — that's fine"
                size="sm"
                className="text-brand-green dark:text-emerald-400"
              />
            ) : null}
            <span className="font-medium text-sky-950 dark:text-sky-50">
              {waterConsumedDisplay}
            </span>
            <span className="text-sky-700/70 dark:text-sky-300/70">
              of {waterTargetDisplay} {waterUnit}
            </span>
          </span>
        </div>
        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-sky-200/60 dark:bg-sky-900/40"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={waterBarPct}
          aria-label="Water progress"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-out ${
              isOverWater
                ? "bg-brand-green shadow-[0_0_10px_rgba(34,179,107,0.35)]"
                : "bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.3)]"
            }`}
            style={{ width: `${waterBarPct}%` }}
          />
        </div>
        {summary.waterMlTargetIsDefault ? (
          <p className="mt-2 text-[11px] leading-snug text-sky-800/70 dark:text-sky-300/70">
            Using a default aim of {waterTargetDisplay} {waterUnit} — set your
            own anytime in Profile.
          </p>
        ) : null}
        <WaterLogControl preferredUnits={summary.preferredUnits} />
      </div>
    </section>
  );
}
