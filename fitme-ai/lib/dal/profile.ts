import "server-only";
import type {
  ActivityLevel,
  GlucoseUnit,
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
import type { NotificationPreferencesInput } from "@/lib/schemas/profile";
import type { AppearancePreference } from "@/lib/domain/appearance/types";

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
    preferredGlucoseUnit: row.preferredGlucoseUnit,
    eatBackExercise: row.eatBackExercise,
    notifyFastingEnd: row.notifyFastingEnd,
    notifyWeeklyDigest: row.notifyWeeklyDigest,
    appearancePreference: row.appearancePreference,
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
    preferredGlucoseUnit: GlucoseUnit;
    eatBackExercise: boolean;
    country: string;
    timezone: string;
    appearancePreference?: AppearancePreference;
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

export type DisplayPreferencesInput = {
  preferredUnits: PreferredUnits;
  preferredGlucoseUnit: GlucoseUnit;
  timezone: string;
};

/**
 * Patch the display-only fields without re-running target maths.
 *
 * These three change how existing numbers are *shown* (and which calendar day
 * an entry falls in), never what is stored, so they don't need the full profile
 * round-trip. Returns `null` when there's no profile yet — units have nowhere
 * to live until the profile exists.
 */
export async function updateDisplayPreferences(
  userId: string,
  input: DisplayPreferencesInput,
): Promise<ProfileDto | null> {
  const existing = await prisma.userProfile.findUnique({ where: { userId } });
  if (!existing) return null;
  assertOwnership(existing.userId, userId);

  const row = await prisma.userProfile.update({
    where: { userId },
    data: input,
  });
  return toProfileDto(row);
}

/** Patch reminder prefs (stored now; delivery comes later). */
export async function updateNotificationPreferences(
  userId: string,
  input: NotificationPreferencesInput,
): Promise<ProfileDto | null> {
  const existing = await prisma.userProfile.findUnique({ where: { userId } });
  if (!existing) return null;
  assertOwnership(existing.userId, userId);

  const row = await prisma.userProfile.update({
    where: { userId },
    data: input,
  });
  return toProfileDto(row);
}

/** Patch appearance only — instant from Settings, no target maths. */
export async function updateAppearancePreference(
  userId: string,
  appearancePreference: AppearancePreference,
): Promise<ProfileDto | null> {
  const existing = await prisma.userProfile.findUnique({ where: { userId } });
  if (!existing) return null;
  assertOwnership(existing.userId, userId);

  const row = await prisma.userProfile.update({
    where: { userId },
    data: { appearancePreference },
  });
  return toProfileDto(row);
}
