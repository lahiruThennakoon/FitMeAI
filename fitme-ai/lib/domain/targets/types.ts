import type {
  ActivityLevel,
  PreferredUnits,
  Sex,
} from "@/lib/domain/targets/bmr";
import type { GoalType } from "@/lib/domain/targets/suggest-targets";

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
