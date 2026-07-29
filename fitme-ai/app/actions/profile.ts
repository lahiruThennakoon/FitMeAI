"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/dal";
import {
  getGoalForUser,
  getProfileForUser,
  updateDisplayPreferences,
  updateNotificationPreferences,
  upsertProfileAndGoal,
  type UpsertProfileGoalInput,
} from "@/lib/dal/profile";
import type { GoalDto, ProfileDto } from "@/lib/domain/targets/types";
import {
  evaluateSafetyLadder,
  NO_MEDICAL_ADVICE,
  SAFETY_CONSENT_REQUIRED_ERROR,
  type SafetyAssessment,
} from "@/lib/domain/safety/ladder";
import {
  MIFFLIN_ST_JEOR_FORMULA,
  ACTIVITY_MULTIPLIERS,
} from "@/lib/domain/targets/bmr";
import {
  mergeOverrides,
  suggestTargets,
} from "@/lib/domain/targets/suggest-targets";
import {
  parseHeightToCm,
  parseMassToG,
} from "@/lib/domain/targets/units";
import { fieldErrorsFromZod } from "@/lib/auth/actions-shared";
import { logger } from "@/lib/logging";
import { err, ok, type Result } from "@/lib/result";
import {
  displayPreferencesSchema,
  notificationPreferencesSchema,
  saveProfileSchema,
} from "@/lib/schemas/profile";

export type SaveProfileResult = Result<{
  profile: ProfileDto;
  goal: GoalDto;
  formula: typeof MIFFLIN_ST_JEOR_FORMULA;
  activityMultiplier: number;
  safety: SafetyAssessment;
}>;

export type LoadProfileResult = Result<{
  profile: ProfileDto | null;
  goal: GoalDto | null;
  formula: typeof MIFFLIN_ST_JEOR_FORMULA;
}>;

export type PreviewTargetsResult = Result<{
  suggested: ReturnType<typeof suggestTargets>;
  effective: ReturnType<typeof suggestTargets>;
  formula: typeof MIFFLIN_ST_JEOR_FORMULA;
  activityMultiplier: number;
  safety: SafetyAssessment;
  noMedicalAdvice: string;
}>;

export type ProfileActionDeps = {
  requireSession?: typeof requireSession;
  upsertProfileAndGoal?: typeof upsertProfileAndGoal;
  getProfileForUser?: typeof getProfileForUser;
  getGoalForUser?: typeof getGoalForUser;
};

export type DisplayPreferencesActionDeps = {
  requireSession?: typeof requireSession;
  updateDisplayPreferences?: typeof updateDisplayPreferences;
  revalidate?: (path: string) => void;
};

export type DisplayPreferencesResult = Result<{ profile: ProfileDto }>;
export type NotificationPreferencesResult = Result<{ profile: ProfileDto }>;

export const PROFILE_REQUIRED_ERROR =
  "Set up your profile first — units and timezone live alongside it.";

/** Change how numbers are shown (and where the day starts) without touching targets. */
export async function saveDisplayPreferencesAction(
  input: unknown,
  deps: DisplayPreferencesActionDeps = {},
): Promise<DisplayPreferencesResult> {
  const parsed = displayPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Please check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const getSession = deps.requireSession ?? requireSession;
  const update = deps.updateDisplayPreferences ?? updateDisplayPreferences;
  const revalidate = deps.revalidate ?? revalidatePath;

  let userId: string;
  try {
    const user = await getSession();
    userId = user.id;
  } catch {
    return err("Please sign in to change your preferences.");
  }

  try {
    const profile = await update(userId, parsed.data);
    if (!profile) return err(PROFILE_REQUIRED_ERROR);
    // The timezone moves day boundaries, so every dated view is now stale.
    for (const path of ["/dashboard", "/progress", "/settings", "/goals"]) {
      revalidate(path);
    }
    logger.info("profile.preferences.updated", { outcome: "accepted", userId });
    return ok({ profile });
  } catch {
    logger.error("profile.preferences.failed", { outcome: "error", userId });
    return err("Could not save your preferences. Please try again.");
  }
}

export type NotificationPreferencesActionDeps = {
  requireSession?: typeof requireSession;
  updateNotificationPreferences?: typeof updateNotificationPreferences;
  revalidate?: (path: string) => void;
};

/** Save reminder toggles (Tier 3 — delivery not wired yet). */
export async function saveNotificationPreferencesAction(
  input: unknown,
  deps: NotificationPreferencesActionDeps = {},
): Promise<NotificationPreferencesResult> {
  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Please check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const getSession = deps.requireSession ?? requireSession;
  const update = deps.updateNotificationPreferences ?? updateNotificationPreferences;
  const revalidate = deps.revalidate ?? revalidatePath;

  let userId: string;
  try {
    const user = await getSession();
    userId = user.id;
  } catch {
    return err("Please sign in to change your preferences.");
  }

  try {
    const profile = await update(userId, parsed.data);
    if (!profile) return err(PROFILE_REQUIRED_ERROR);
    revalidate("/settings");
    logger.info("profile.notifications.updated", { outcome: "accepted", userId });
    return ok({ profile });
  } catch {
    logger.error("profile.notifications.failed", { outcome: "error", userId });
    return err("Could not save your preferences. Please try again.");
  }
}

function overriddenFieldNames(
  overrides: Record<string, number | undefined> | undefined,
): string[] {
  if (!overrides) return [];
  return Object.entries(overrides)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
    .map(([k]) => k);
}

function toCanonical(input: {
  preferredUnits: "metric" | "imperial";
  height: number;
  currentWeight: number;
  targetWeight: number;
}) {
  return {
    heightCm: parseHeightToCm(input.height, input.preferredUnits),
    currentWeightG: parseMassToG(input.currentWeight, input.preferredUnits),
    targetWeightG: parseMassToG(input.targetWeight, input.preferredUnits),
  };
}

function assess(
  data: {
    sex: "male" | "female";
    goalType: string;
  },
  canonical: {
    heightCm: number;
    currentWeightG: number;
    targetWeightG: number;
  },
  effective: ReturnType<typeof suggestTargets>,
): SafetyAssessment {
  return evaluateSafetyLadder({
    sex: data.sex,
    heightCm: canonical.heightCm,
    currentWeightG: canonical.currentWeightG,
    targetWeightG: canonical.targetWeightG,
    caloriesKcal: effective.caloriesKcal,
    tdeeKcal: effective.tdeeKcal,
    weeklyWeightChangeG: effective.weeklyWeightChangeG,
    goalType: data.goalType,
  });
}

export async function previewTargetsAction(
  input: unknown,
): Promise<PreviewTargetsResult> {
  const parsed = saveProfileSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Please check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const data = parsed.data;
  const canonical = toCanonical(data);
  const suggested = suggestTargets({
    weightG: canonical.currentWeightG,
    heightCm: canonical.heightCm,
    ageYears: data.ageYears,
    sex: data.sex,
    activityLevel: data.activityLevel,
    goalType: data.goalType,
    targetWeightG: canonical.targetWeightG,
  });
  const effective = mergeOverrides(suggested, data.overrides ?? {});
  const safety = assess(data, canonical, effective);

  return ok({
    suggested,
    effective,
    formula: MIFFLIN_ST_JEOR_FORMULA,
    activityMultiplier: ACTIVITY_MULTIPLIERS[data.activityLevel],
    safety,
    noMedicalAdvice: NO_MEDICAL_ADVICE,
  });
}

export async function saveProfileAction(
  input: unknown,
  deps: ProfileActionDeps = {},
): Promise<SaveProfileResult> {
  const parsed = saveProfileSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Please check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const getSession = deps.requireSession ?? requireSession;
  const upsert = deps.upsertProfileAndGoal ?? upsertProfileAndGoal;

  let userId: string;
  try {
    const user = await getSession();
    userId = user.id;
  } catch {
    return err("Please sign in to save your profile.");
  }

  const data = parsed.data;
  const canonical = toCanonical(data);
  const suggested = suggestTargets({
    weightG: canonical.currentWeightG,
    heightCm: canonical.heightCm,
    ageYears: data.ageYears,
    sex: data.sex,
    activityLevel: data.activityLevel,
    goalType: data.goalType,
    targetWeightG: canonical.targetWeightG,
  });
  const effective = mergeOverrides(suggested, data.overrides ?? {});
  const overriddenFields = overriddenFieldNames(data.overrides);
  const safety = assess(data, canonical, effective);

  if (safety.requiresConsent && !data.safetyConsent) {
    logger.info("profile.save.blocked_safety", {
      outcome: "consent_required",
      userId,
      level: safety.level,
    });
    return err(SAFETY_CONSENT_REQUIRED_ERROR, {
      safetyConsent: SAFETY_CONSENT_REQUIRED_ERROR,
    });
  }

  const consented = safety.level === "red" && Boolean(data.safetyConsent);
  const payload: UpsertProfileGoalInput = {
    profile: {
      displayName: data.displayName,
      ageYears: data.ageYears,
      sex: data.sex,
      heightCm: canonical.heightCm,
      currentWeightG: canonical.currentWeightG,
      targetWeightG: canonical.targetWeightG,
      activityLevel: data.activityLevel,
      dietaryPreferences: data.dietaryPreferences,
      goalType: data.goalType,
      preferredUnits: data.preferredUnits,
      preferredGlucoseUnit: data.preferredGlucoseUnit,
      eatBackExercise: data.eatBackExercise,
      country: data.country,
      timezone: data.timezone,
    },
    goal: {
      bmrKcal: effective.bmrKcal,
      tdeeKcal: effective.tdeeKcal,
      caloriesKcal: effective.caloriesKcal,
      proteinG: effective.proteinG,
      carbsG: effective.carbsG,
      fatG: effective.fatG,
      fibreG: effective.fibreG,
      waterMl: effective.waterMl,
      steps: effective.steps,
      exerciseMinutes: effective.exerciseMinutes,
      weeklyWeightChangeG: effective.weeklyWeightChangeG,
      overriddenFields,
      safetyLevel: safety.level,
      safetyReasons: safety.reasons,
      safetyConsentGiven: consented,
      safetyConsentAt: consented ? new Date() : null,
    },
  };

  try {
    const saved = await upsert(userId, payload);
    logger.info("profile.save.completed", {
      outcome: "accepted",
      userId,
      safetyLevel: safety.level,
      safetyConsent: consented,
    });
    return ok({
      ...saved,
      formula: MIFFLIN_ST_JEOR_FORMULA,
      activityMultiplier: ACTIVITY_MULTIPLIERS[data.activityLevel],
      safety,
    });
  } catch {
    logger.error("profile.save.failed", { outcome: "error", userId });
    return err("Could not save your profile. Please try again.");
  }
}

export async function loadProfileAction(
  deps: ProfileActionDeps = {},
): Promise<LoadProfileResult> {
  const getSession = deps.requireSession ?? requireSession;
  const getProfile = deps.getProfileForUser ?? getProfileForUser;
  const getGoal = deps.getGoalForUser ?? getGoalForUser;

  let userId: string;
  try {
    const user = await getSession();
    userId = user.id;
  } catch {
    return err("Please sign in to view your profile.");
  }

  try {
    const [profile, goal] = await Promise.all([
      getProfile(userId),
      getGoal(userId),
    ]);
    return ok({ profile, goal, formula: MIFFLIN_ST_JEOR_FORMULA });
  } catch {
    logger.error("profile.load.failed", { outcome: "error", userId });
    return err("Could not load your profile.");
  }
}
