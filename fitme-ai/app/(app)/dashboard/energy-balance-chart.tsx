import type { EnergyBalanceStatus } from "@/lib/domain/dashboard/daily-summary";
import { DeviationMark } from "./deviation-mark";

type Props = {
  intakeKcal: number;
  baselineBurnKcal: number;
  exerciseKcal: number;
  balance: EnergyBalanceStatus;
};

/**
 * Hero energy snapshot: ring for the gap + Food / Burn rows.
 * Plain language — no “deficit” framing.
 */
export function EnergyBalanceChart({
  intakeKcal,
  baselineBurnKcal,
  exerciseKcal,
  balance,
}: Props) {
  const food = Math.round(intakeKcal);
  const burn = Math.round(baselineBurnKcal + exerciseKcal);
  const max = Math.max(food, burn, 1);
  const foodPct = Math.min(100, Math.round((food / max) * 100));
  const burnPct = Math.min(100, Math.round((burn / max) * 100));
  const eatenOfBurn =
    burn <= 0 ? 0 : Math.min(100, Math.round((food / burn) * 100));
  const isOver = balance.kind === "over";
  const isUnder = balance.kind === "under";

  const ringPct =
    balance.kind === "even" ? 100 : isOver ? 100 : Math.max(8, eatenOfBurn);
  const ringStroke = isOver
    ? "stroke-red-500"
    : isUnder
      ? "stroke-brand-green"
      : "stroke-brand-teal";
  const ringGlow = isOver
    ? "drop-shadow-[0_0_8px_rgba(239,68,68,0.35)]"
    : isUnder
      ? "drop-shadow-[0_0_8px_rgba(34,179,107,0.35)]"
      : "drop-shadow-[0_0_8px_rgba(14,165,165,0.3)]";

  const heroSub = isOver
    ? "kcal over"
    : isUnder
      ? "kcal left"
      : "kcal even";

  const story = isOver
    ? `You've logged ${balance.gapKcal} kcal more than burn.`
    : isUnder
      ? `You still have ${balance.gapKcal} kcal to eat.`
      : "Food and burn match today.";

  const burnHint =
    exerciseKcal > 0
      ? `Includes ${Math.round(exerciseKcal)} exercise`
      : "Rest-day estimate";

  return (
    <div data-testid="energy-balance-chart" className="mt-3 space-y-4">
      <div className="flex items-center gap-4">
        <EnergyRing
          pct={ringPct}
          strokeClass={ringStroke}
          glowClass={ringGlow}
          value={balance.kind === "even" ? "≈" : String(balance.gapKcal)}
          label={heroSub}
          alert={isOver}
        />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-snug text-neutral-900 dark:text-white">
            {isOver ? (
              <>
                <DeviationMark
                  kind="up"
                  label={balance.statusLabel}
                  size="md"
                  alert
                  className="mr-1 align-middle"
                />
                <span className="text-red-600 dark:text-red-400">
                  {balance.gapKcal}
                </span>{" "}
                kcal over burn
              </>
            ) : isUnder ? (
              <>
                You still have{" "}
                <span className="text-brand-green">{balance.gapKcal}</span> kcal
              </>
            ) : (
              "Food matches burn"
            )}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            {story}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <MetricRow
          icon="🍽️"
          iconClass="bg-brand-blue/15 text-brand-blue"
          label="Food"
          hint="Calories eaten"
          value={food}
          pct={foodPct}
          barClass={
            isOver
              ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.35)]"
              : "bg-brand-blue shadow-[0_0_10px_rgba(47,87,227,0.3)]"
          }
        />
        <MetricRow
          icon="🔥"
          iconClass="bg-brand-teal/15 text-brand-teal"
          label="Burn"
          hint={burnHint}
          value={burn}
          pct={burnPct}
          barClass="bg-brand-teal shadow-[0_0_10px_rgba(14,165,165,0.3)]"
        />
      </div>
    </div>
  );
}

function EnergyRing({
  pct,
  strokeClass,
  glowClass,
  value,
  label,
  alert,
}: {
  pct: number;
  strokeClass: string;
  glowClass: string;
  value: string;
  label: string;
  alert: boolean;
}) {
  const size = 112;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={`-rotate-90 ${glowClass}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-neutral-200 dark:stroke-neutral-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={strokeClass}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {alert ? (
          <span className="text-sm font-semibold text-red-500" aria-hidden="true">
            ↑
          </span>
        ) : null}
        <span
          className={`text-2xl font-semibold tabular-nums leading-none ${
            alert
              ? "text-red-600 dark:text-red-400"
              : "text-neutral-900 dark:text-white"
          }`}
        >
          {value}
        </span>
        <span
          className={`mt-0.5 text-[10px] font-medium ${
            alert
              ? "text-red-500/90"
              : label.includes("left")
                ? "text-brand-green dark:text-emerald-300"
                : "text-brand-teal dark:text-teal-300"
          }`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function MetricRow({
  icon,
  iconClass,
  label,
  hint,
  value,
  pct,
  barClass,
}: {
  icon: string;
  iconClass: string;
  label: string;
  hint: string;
  value: number;
  pct: number;
  barClass: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200/60 bg-white/60 px-3 py-2.5 dark:border-neutral-700/70 dark:bg-neutral-950/40">
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${iconClass}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                {label}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {hint}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
              {value} kcal
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-800">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ease-out ${barClass}`}
              style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
