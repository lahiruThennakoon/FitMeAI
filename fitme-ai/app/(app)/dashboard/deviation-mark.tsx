export type DeviationKind = "up" | "down" | "even";

/**
 * Compare a value to a reference — over → ↑, under → ↓, near → ≈.
 */
export function deviationKind(
  value: number,
  reference: number,
  epsilon = 0,
): DeviationKind {
  const delta = value - reference;
  if (Math.abs(delta) <= epsilon) return "even";
  return delta > 0 ? "up" : "down";
}

const SYMBOL: Record<DeviationKind, string> = {
  up: "↑",
  down: "↓",
  even: "≈",
};

const TONE: Record<DeviationKind, string> = {
  up: "text-sky-700 dark:text-sky-300",
  down: "text-emerald-700 dark:text-emerald-300",
  even: "text-teal-700 dark:text-teal-300",
};

type Props = {
  kind: DeviationKind;
  /** Visually hidden label for screen readers, e.g. "over target". */
  label: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Use for over-limit / above-burn — red ↑ (“too much / higher”). */
  alert?: boolean;
};

/**
 * ↑ / ↓ / ≈ mark for numeric deviations — decorative; meaning also in text.
 */
export function DeviationMark({
  kind,
  label,
  className = "",
  size = "md",
  alert = false,
}: Props) {
  const sizeClass =
    size === "lg"
      ? "text-2xl leading-none"
      : size === "sm"
        ? "text-xs leading-none"
        : "text-base leading-none";

  const tone = alert
    ? "text-red-600 dark:text-red-400"
    : TONE[kind];
  /** Alert always means over → ↑, regardless of passed kind. */
  const symbol = alert ? "↑" : SYMBOL[kind];

  return (
    <span
      className={`inline-flex shrink-0 font-semibold ${sizeClass} ${tone} ${className}`}
      aria-label={label}
      data-deviation={alert ? "alert-over" : kind}
    >
      <span aria-hidden="true">{symbol}</span>
    </span>
  );
}
