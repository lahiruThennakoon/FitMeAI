import type {
  ActivityLevel,
  PreferredUnits,
  Sex,
} from "@/lib/domain/targets/bmr";
import type { GoalType } from "@/lib/domain/targets/suggest-targets";
import type { GlucoseDisplayUnit } from "@/lib/domain/glucose/units";
import type { AppearancePreference } from "@/lib/domain/appearance/types";

export type ProfileDto = {
  displayName: string;
  ageYears: number;
  sex: Sex;
  heightCm: number;
  currentWeightG: number;
  targetWeightG: number;
  activityLevel: ActivityLevel;
  dietaryPreferences: string[];
  goalType: GoalType;
  preferredUnits: PreferredUnits;
  preferredGlucoseUnit: GlucoseDisplayUnit;
  /** Credit exercise burn back into the day's food budget ("Remaining"). */
  eatBackExercise: boolean;
  /** Saved for when reminder delivery ships; no notifications sent yet. */
  notifyFastingEnd: boolean;
  notifyWeeklyDigest: boolean;
  appearancePreference: AppearancePreference;
  country: string;
  timezone: string;
};

export type SafetyLevelDto = "green" | "yellow" | "red";

export type GoalDto = {
  bmrKcal: number;
  tdeeKcal: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  waterMl: number;
  steps: number;
  exerciseMinutes: number;
  weeklyWeightChangeG: number;
  overriddenFields: string[];
  safetyLevel: SafetyLevelDto;
  safetyReasons: string[];
  safetyConsentGiven: boolean;
  safetyConsentAt: string | null;
};

export type { ActivityLevel, GoalType, PreferredUnits, Sex };
