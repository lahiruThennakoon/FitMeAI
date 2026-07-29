/**
 * Weight pacing vs planned weekly change (Story 6.3).
 * Calm, informational copy — no shame, no medical advice.
 */

export type WeightPacingEntry = {
  weightG: number;
  recordedAt: string;
};

export type PacingComparison = "on_pace" | "ahead" | "behind";

export type WeightPacingResult =
  | { status: "hidden" }
  | {
      status: "insufficient_data";
      message: string;
    }
  | {
      status: "ready";
      plannedWeeklyChangeG: number;
      actualWeeklyChangeG: number;
      windowDays: number;
      comparison: PacingComparison;
      message: string;
      weeklyChangeOverridden: boolean;
    };

export type EvaluateWeightPacingInput = {
  entries: WeightPacingEntry[];
  plannedWeeklyChangeG: number;
  weeklyChangeOverridden: boolean;
  preferredUnits?: "metric" | "imperial";
  minSpanDays?: number;
  now?: Date;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_MIN_SPAN_DAYS = 7;
const MIN_PLAN_ABS_G = 100;

export function shouldShowWeightPacing(input: {
  plannedWeeklyChangeG: number;
  weeklyChangeOverridden: boolean;
}): boolean {
  if (input.plannedWeeklyChangeG === 0) return false;
  if (input.weeklyChangeOverridden) return true;
  return Math.abs(input.plannedWeeklyChangeG) >= 500;
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / MS_PER_DAY;
}

function comparePacing(planned: number, actual: number): PacingComparison {
  if (planned === 0) return "on_pace";
  const tolerance = Math.max(100, Math.abs(planned) * 0.25);
  const delta = actual - planned;
  if (Math.abs(delta) <= tolerance) return "on_pace";
  if (planned < 0) {
    return actual < planned ? "ahead" : "behind";
  }
  return actual > planned ? "ahead" : "behind";
}

function pacingMessage(input: {
  comparison: PacingComparison;
  plannedWeeklyChangeG: number;
  actualWeeklyChangeG: number;
  windowDays: number;
  weeklyChangeOverridden: boolean;
  formatRate: (gramsPerWeek: number) => string;
}): string {
  const plan = input.formatRate(input.plannedWeeklyChangeG);
  const actual = input.formatRate(input.actualWeeklyChangeG);
  const window = Math.round(input.windowDays);
  const planNote = input.weeklyChangeOverridden
    ? "your chosen weekly plan"
    : "your weekly plan";

  switch (input.comparison) {
    case "on_pace":
      return `Over the last ${window} days, weigh-ins average about ${actual} — close to ${planNote} (${plan}). Bodies vary day to day.`;
    case "ahead":
      return `Over the last ${window} days, weigh-ins average about ${actual} — a bit faster than ${planNote} (${plan}). Just information, not a verdict.`;
    case "behind":
      return `Over the last ${window} days, weigh-ins average about ${actual} — slower than ${planNote} (${plan}). That's common; progress isn't always linear.`;
  }
}

export function evaluateWeightPacing(
  input: EvaluateWeightPacingInput,
): WeightPacingResult {
  const minSpan = input.minSpanDays ?? DEFAULT_MIN_SPAN_DAYS;

  if (!shouldShowWeightPacing(input)) {
    return { status: "hidden" };
  }

  if (Math.abs(input.plannedWeeklyChangeG) < MIN_PLAN_ABS_G) {
    return { status: "hidden" };
  }

  const sorted = [...input.entries].sort(
    (a, b) =>
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );

  if (sorted.length < 2) {
    return {
      status: "insufficient_data",
      message:
        "Log at least two weigh-ins about a week apart to see pacing vs your weekly plan.",
    };
  }

  const oldest = sorted[0]!;
  const newest = sorted[sorted.length - 1]!;
  const spanDays = daysBetween(
    new Date(oldest.recordedAt),
    new Date(newest.recordedAt),
  );

  if (spanDays < minSpan) {
    return {
      status: "insufficient_data",
      message: `Keep logging — after about ${minSpan} days between weigh-ins, you'll see pacing vs your plan here.`,
    };
  }

  const weeks = spanDays / 7;
  const actualWeeklyChangeG = (newest.weightG - oldest.weightG) / weeks;
  const comparison = comparePacing(
    input.plannedWeeklyChangeG,
    actualWeeklyChangeG,
  );
  const units = input.preferredUnits ?? "metric";

  return {
    status: "ready",
    plannedWeeklyChangeG: input.plannedWeeklyChangeG,
    actualWeeklyChangeG,
    windowDays: spanDays,
    comparison,
    weeklyChangeOverridden: input.weeklyChangeOverridden,
    message: pacingMessage({
      comparison,
      plannedWeeklyChangeG: input.plannedWeeklyChangeG,
      actualWeeklyChangeG,
      windowDays: spanDays,
      weeklyChangeOverridden: input.weeklyChangeOverridden,
      formatRate: (g) => formatWeeklyChangeRate(g, units),
    }),
  };
}

export function formatWeeklyChangeRate(
  gramsPerWeek: number,
  preferredUnits: "metric" | "imperial",
): string {
  const abs = Math.abs(gramsPerWeek);
  const dir =
    gramsPerWeek < 0 ? "loss" : gramsPerWeek > 0 ? "gain" : "";
  if (preferredUnits === "imperial") {
    const lb = (abs / 1000) * 2.2046226218;
    return `${lb.toFixed(2)} lb/wk${dir ? ` ${dir}` : ""}`;
  }
  return `${(abs / 1000).toFixed(2)} kg/wk${dir ? ` ${dir}` : ""}`;
}
