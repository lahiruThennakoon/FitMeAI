/**
 * Daily nutrition summary for the Home dashboard (Story 3.3 / FR-15).
 * Supportive, non-judgmental copy (UX-DR2).
 */

import {
  computeBaselineBurn,
  computeNetCalories,
  type BaselineBurnResult,
} from "@/lib/domain/burn/baseline";
import type { GoalDto, ProfileDto } from "@/lib/domain/targets/types";
import type { PreferredUnits } from "@/lib/domain/targets/units";

export type MacroTotals = {
  energyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  sugarG: number;
  sodiumMg: number;
};

export type MacroProgress = {
  key: keyof Omit<MacroTotals, "energyKcal" | "sodiumMg"> | "calories";
  label: string;
  consumed: number;
  target: number | null;
  /** 0–1 when target known; null otherwise. */
  ratio: number | null;
  unit: string;
};

/** Plain-language energy balance for the dashboard (not a signed net alone). */
export type EnergyBalanceStatus = {
  kind: "under" | "over" | "even";
  /** Absolute gap in kcal (0 when even). */
  gapKcal: number;
  /** Short status chip, e.g. "Under today". */
  statusLabel: string;
  /** One supportive sentence — no guilt. */
  explanation: string;
};

export type DailySummary = {
  dayKey: string;
  intakeKcal: number;
  exerciseKcal: number;
  baseline: BaselineBurnResult | null;
  netKcal: number | null;
  targetKcal: number | null;
  remainingKcal: number | null;
  macros: MacroTotals;
  waterMlConsumed: number;
  waterMlTarget: number;
  /** True when waterMlTarget falls back to DEFAULT_WATER_ML_TARGET (no Goal set). */
  waterMlTargetIsDefault: boolean;
  /** Canonical storage stays ml (AD-11); this is display-only (Story 5.1 / AC7). */
  preferredUnits: PreferredUnits;
  progress: MacroProgress[];
  mealCount: number;
  supportiveMessage: string;
  hasGoal: boolean;
};

/**
 * Soft default daily water aim (ml) used when the user has no Goal yet
 * (Story 5.1 / FR-15). Labelled as a default in the UI — never blocks logging.
 */
export const DEFAULT_WATER_ML_TARGET = 2000;

/**
 * WHO-style soft sugar aim: ~10% of daily calorie target as free sugars (g).
 * kcal × 0.10 ÷ 4 kcal/g.
 */
export function sugarLimitFromCalories(caloriesKcal: number | null): number | null {
  if (caloriesKcal == null || !Number.isFinite(caloriesKcal) || caloriesKcal <= 0) {
    return null;
  }
  return Math.round((caloriesKcal * 0.1) / 4);
}

/**
 * Translate signed net into plain status language.
 * Negative net = food below burn (room left) — not a failure.
 */
export function describeEnergyBalance(netKcal: number): EnergyBalanceStatus {
  const gap = Math.abs(Math.round(netKcal));
  if (gap < 50) {
    return {
      kind: "even",
      gapKcal: gap,
      statusLabel: "On track",
      explanation: "Food and burn are about even.",
    };
  }
  if (netKcal < 0) {
    return {
      kind: "under",
      gapKcal: gap,
      statusLabel: "Room left",
      explanation: `You still have ${gap} kcal to eat.`,
    };
  }
  return {
    kind: "over",
    gapKcal: gap,
    statusLabel: "Above burn",
    explanation: `You've logged ${gap} kcal more than burn.`,
  };
}

export type FoodEntryLike = {
  energyKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fibreG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
};

const EMPTY_MACROS: MacroTotals = {
  energyKcal: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fibreG: 0,
  sugarG: 0,
  sodiumMg: 0,
};

export function sumMacros(entries: FoodEntryLike[]): MacroTotals {
  return entries.reduce<MacroTotals>(
    (acc, e) => ({
      energyKcal: acc.energyKcal + (e.energyKcal ?? 0),
      proteinG: acc.proteinG + (e.proteinG ?? 0),
      carbsG: acc.carbsG + (e.carbsG ?? 0),
      fatG: acc.fatG + (e.fatG ?? 0),
      fibreG: acc.fibreG + (e.fibreG ?? 0),
      sugarG: acc.sugarG + (e.sugarG ?? 0),
      sodiumMg: acc.sodiumMg + (e.sodiumMg ?? 0),
    }),
    { ...EMPTY_MACROS },
  );
}

function ratio(consumed: number, target: number | null): number | null {
  if (target == null || target <= 0) return null;
  return Math.min(1, Math.max(0, consumed / target));
}

export function supportiveDashboardMessage(input: {
  mealCount: number;
  remainingKcal: number | null;
  hasGoal: boolean;
  hasProfile: boolean;
}): string {
  if (!input.hasProfile) {
    return "Set up your profile when you're ready — you can still log meals anytime.";
  }
  if (input.mealCount === 0) {
    return "Whenever you're ready, a quick meal log helps you see the day clearly.";
  }
  if (!input.hasGoal) {
    return "Nice logging. Intake vs. burn is below — add targets anytime for more guidance.";
  }
  if (input.remainingKcal != null && input.remainingKcal > 200) {
    return "You've got room left today if you want it — no pressure either way.";
  }
  if (input.remainingKcal != null && input.remainingKcal < -200) {
    return "Today's numbers are just information. Tomorrow is a fresh page.";
  }
  return "Solid reflection point — use this snapshot to decide your next move.";
}

export function buildDailySummary(input: {
  dayKey: string;
  entries: FoodEntryLike[];
  exerciseKcal: number;
  waterMlConsumed?: number;
  profile: ProfileDto | null;
  goal: GoalDto | null;
}): DailySummary {
  const macros = sumMacros(input.entries);
  const intakeKcal = Math.round(macros.energyKcal);
  const baseline = input.profile
    ? computeBaselineBurn({
        weightG: input.profile.currentWeightG,
        heightCm: input.profile.heightCm,
        ageYears: input.profile.ageYears,
        sex: input.profile.sex,
        activityLevel: input.profile.activityLevel,
      })
    : null;

  const netKcal =
    baseline != null
      ? computeNetCalories({
          intakeKcal,
          baselineBurnKcal: baseline.baselineBurnKcal,
          exerciseKcal: input.exerciseKcal,
        })
      : null;

  const targetKcal = input.goal?.caloriesKcal ?? null;
  const remainingKcal =
    targetKcal != null ? Math.round(targetKcal - intakeKcal) : null;
  /** Soft daily sugar aim from calorie target (WHO ~10% energy as free sugars). */
  const sugarLimitG = sugarLimitFromCalories(targetKcal);

  const progress: MacroProgress[] = [
    {
      key: "calories",
      label: "Calories",
      consumed: intakeKcal,
      target: targetKcal,
      ratio: ratio(intakeKcal, targetKcal),
      unit: "kcal",
    },
    {
      key: "proteinG",
      label: "Protein",
      consumed: Math.round(macros.proteinG),
      target: input.goal?.proteinG ?? null,
      ratio: ratio(macros.proteinG, input.goal?.proteinG ?? null),
      unit: "g",
    },
    {
      key: "carbsG",
      label: "Carbs",
      consumed: Math.round(macros.carbsG),
      target: input.goal?.carbsG ?? null,
      ratio: ratio(macros.carbsG, input.goal?.carbsG ?? null),
      unit: "g",
    },
    {
      key: "fatG",
      label: "Fat",
      consumed: Math.round(macros.fatG),
      target: input.goal?.fatG ?? null,
      ratio: ratio(macros.fatG, input.goal?.fatG ?? null),
      unit: "g",
    },
    {
      key: "fibreG",
      label: "Fibre",
      consumed: Math.round(macros.fibreG),
      target: input.goal?.fibreG ?? null,
      ratio: ratio(macros.fibreG, input.goal?.fibreG ?? null),
      unit: "g",
    },
    {
      key: "sugarG",
      label: "Sugar",
      consumed: Math.round(macros.sugarG),
      target: sugarLimitG,
      ratio: ratio(macros.sugarG, sugarLimitG),
      unit: "g",
    },
  ];

  const hasGoal = input.goal != null;
  const mealCount = input.entries.length;
  const waterMlTargetIsDefault = input.goal?.waterMl == null;
  const waterMlTarget = input.goal?.waterMl ?? DEFAULT_WATER_ML_TARGET;

  return {
    dayKey: input.dayKey,
    intakeKcal,
    exerciseKcal: input.exerciseKcal,
    baseline,
    netKcal,
    targetKcal,
    remainingKcal,
    macros: {
      ...macros,
      energyKcal: intakeKcal,
      proteinG: Math.round(macros.proteinG * 10) / 10,
      carbsG: Math.round(macros.carbsG * 10) / 10,
      fatG: Math.round(macros.fatG * 10) / 10,
      fibreG: Math.round(macros.fibreG * 10) / 10,
      sugarG: Math.round(macros.sugarG * 10) / 10,
      sodiumMg: Math.round(macros.sodiumMg),
    },
    waterMlConsumed: Math.round(input.waterMlConsumed ?? 0),
    waterMlTarget,
    waterMlTargetIsDefault,
    preferredUnits: input.profile?.preferredUnits ?? "metric",
    progress,
    mealCount,
    supportiveMessage: supportiveDashboardMessage({
      mealCount,
      remainingKcal,
      hasGoal,
      hasProfile: input.profile != null,
    }),
    hasGoal,
  };
}
