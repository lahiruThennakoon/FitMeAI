import type { NutritionDataSource } from "@/lib/domain/nutrition/types";
import {
  formatConfidencePercent,
  isEstimatedSource,
  sourceBadgeClassName,
  sourceCitationText,
  sourceLabel,
} from "@/lib/domain/nutrition/source-citation";

type Props = {
  dataSource: NutritionDataSource;
  /** Required for estimated values (FR-10). */
  confidence?: number | null;
  /** Compact chip next to a single macro field. */
  size?: "md" | "sm";
};

/**
 * Trust cue: Database vs Estimated (+ confidence) (FR-10 / UX-DR3).
 */
export function SourceBadge({
  dataSource,
  confidence = null,
  size = "md",
}: Props) {
  const estimated = isEstimatedSource(dataSource);
  const label = sourceLabel(dataSource);
  const title = sourceCitationText(dataSource, confidence);
  const sizeClass =
    size === "sm"
      ? "px-1.5 py-0.5 text-[10px] leading-tight"
      : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-medium ${sizeClass} ${sourceBadgeClassName(dataSource)}`}
      title={title}
      aria-label={title}
    >
      <span>{label}</span>
      {estimated && typeof confidence === "number" ? (
        <span className="font-semibold tabular-nums">
          {formatConfidencePercent(confidence)}
        </span>
      ) : null}
    </span>
  );
}
