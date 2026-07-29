import Link from "next/link";
import type { GlucoseEntryDto } from "@/lib/dal/glucose-entry";
import {
  formatGlucoseContext,
  formatGlucoseValue,
} from "@/lib/domain/glucose/format";
import type { GlucoseDisplayUnit } from "@/lib/domain/glucose/units";

type Props = {
  latest: GlucoseEntryDto | null;
  displayUnit: GlucoseDisplayUnit;
};

/** Home glance for last glucose reading (Story 8.4). */
export function GlucoseGlance({ latest, displayUnit }: Props) {
  if (!latest) return null;

  return (
    <Link
      href="/glucose"
      className="block rounded-2xl border border-neutral-200/80 bg-white/70 p-4 shadow-sm transition hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/60 dark:hover:bg-neutral-900/80"
      data-testid="glucose-glance"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Latest glucose
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">
        {formatGlucoseValue(latest.valueMgDl, displayUnit)}
      </p>
      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
        {formatGlucoseContext(latest.context)} ·{" "}
        {new Date(latest.measuredAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>
      <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-300">
        Your logged data — not medical advice
      </p>
    </Link>
  );
}
