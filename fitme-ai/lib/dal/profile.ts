import "server-only";
import type {
  ActivityLevel,
  Goal,
  GoalType,
  PreferredUnits,
  SafetyLevel,
  Sex,
  UserProfile,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertOwnership } from "@/lib/dal/guards";
import type { GoalDto, ProfileDto } from "@/lib/domain/targets/types";

export type { GoalDto, ProfileDto };

function toProfileDto(row: UserProfile): ProfileDto {
  return {
    displayName: row.displayName,
    ageYears: row.ageYears,
    sex: row.sex,
    heightCm: row.heightCm,
    currentWeightG: row.currentWeightG,
    targetWeightG: row.targetWeightG,
    activityLevel: row.activityLevel,
    dietaryPreferences: row.dietaryPreferences,
    goalType: row.goalType,
    preferredUnits: row.preferredUnits,
    country: row.country,
    timezone: row.timezone,
  };
}

function toGoalDto(row: Goal): GoalDto {
  return {
    bmrKcal: row.bmrKcal,
    tdeeKcal: row.tdeeKcal,
    caloriesKcal: row.caloriesKcal,
    proteinG: row.proteinG,
    carbsG: row.carbsG,
    fatG: row.fatG,
    fibreG: row.fibreG,
    waterMl: row.waterMl,
    steps: row.steps,
    exerciseMinutes: row.exerciseMinutes,
    weeklyWeightChangeG: row.weeklyWeightChangeG,
    overriddenFields: row.overriddenFields,
    safetyLevel: row.safetyLevel,
    safetyReasons: row.safetyReasons,
    safetyConsentGiven: row.safetyConsentGiven,
    safetyConsentAt: row.safetyConsentAt
      ? row.safetyConsentAt.toISOString()
      : null,
  };
}

export async function getProfileForUser(
  userId: string,
): Promise<ProfileDto | null> {
  const row = await prisma.userProfile.findUnique({ where: { userId } });
  if (!row) return null;
  assertOwnership(row.userId, userId);
  return toProfileDto(row);
}

export async function getGoalForUser(userId: string): Promise<GoalDto | null> {
  const row = await prisma.goal.findUnique({ where: { userId } });
  if (!row) return null;
  assertOwnership(row.userId, userId);
  return toGoalDto(row);
}

export type UpsertProfileGoalInput = {
  profile: {
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
  goal: {
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
    safetyLevel: SafetyLevel;
    safetyReasons: string[];
    safetyConsentGiven: boolean;
    safetyConsentAt: Date | null;
  };
};

export async function upsertProfileAndGoal(
  userId: string,
  input: UpsertProfileGoalInput,
): Promise<{ profile: ProfileDto; goal: GoalDto }> {
  const [profile, goal] = await prisma.$transaction([
    prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...input.profile },
      update: { ...input.profile },
    }),
    prisma.goal.upsert({
      where: { userId },
      create: { userId, ...input.goal },
      update: { ...input.goal },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { name: input.profile.displayName },
    }),
  ]);

  assertOwnership(profile.userId, userId);
  assertOwnership(goal.userId, userId);
  return { profile: toProfileDto(profile), goal: toGoalDto(goal) };
}
