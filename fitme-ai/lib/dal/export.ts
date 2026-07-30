import "server-only";
import { prisma } from "@/lib/db";
import { isoOrEmpty, type ExportTable } from "@/lib/domain/export/serialize";

/**
 * Reads everything a user contributed, for the personal-data export (Tier 3).
 *
 * Soft-deleted rows are included with their `deletedAt` so the export is a true
 * copy of what we hold rather than what the UI currently shows — the point of an
 * export is "give me my data", not "give me my active data". Shared reference
 * data (the food catalog, ingredients) is excluded: it isn't the user's.
 */

export type UserExport = {
  exportedAt: string;
  account: Record<string, unknown>;
  profile: Record<string, unknown> | null;
  goal: Record<string, unknown> | null;
  meals: Record<string, unknown>[];
  exercise: Record<string, unknown>[];
  water: Record<string, unknown>[];
  weight: Record<string, unknown>[];
  fasting: Record<string, unknown>[];
  glucose: Record<string, unknown>[];
  aiInteractions: Record<string, unknown>[];
};

export async function getUserExport(
  userId: string,
  now: Date = new Date(),
): Promise<UserExport | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) return null;

  const [
    profile,
    goal,
    meals,
    exercise,
    water,
    weight,
    fasting,
    glucose,
    aiInteractions,
  ] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.goal.findUnique({ where: { userId } }),
    prisma.foodEntry.findMany({
      where: { userId },
      orderBy: { loggedAt: "asc" },
      include: { items: true },
    }),
    prisma.exerciseEntry.findMany({
      where: { userId },
      orderBy: { performedAt: "asc" },
    }),
    prisma.waterEntry.findMany({
      where: { userId },
      orderBy: { loggedAt: "asc" },
    }),
    prisma.weightEntry.findMany({
      where: { userId },
      orderBy: { recordedAt: "asc" },
    }),
    prisma.fastingSession.findMany({
      where: { userId },
      orderBy: { startedAt: "asc" },
    }),
    prisma.glucoseEntry.findMany({
      where: { userId },
      orderBy: { measuredAt: "asc" },
    }),
    prisma.aIInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        providerId: true,
        model: true,
        purpose: true,
        status: true,
        errorCode: true,
        confidence: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    exportedAt: isoOrEmpty(now),
    account: {
      email: user.email,
      name: user.name,
      joinedAt: isoOrEmpty(user.createdAt),
    },
    profile: profile
      ? {
          displayName: profile.displayName,
          ageYears: profile.ageYears,
          sex: profile.sex,
          heightCm: profile.heightCm,
          currentWeightG: profile.currentWeightG,
          targetWeightG: profile.targetWeightG,
          activityLevel: profile.activityLevel,
          dietaryPreferences: profile.dietaryPreferences,
          goalType: profile.goalType,
          preferredUnits: profile.preferredUnits,
          preferredGlucoseUnit: profile.preferredGlucoseUnit,
          eatBackExercise: profile.eatBackExercise,
          appearancePreference: profile.appearancePreference,
          country: profile.country,
          timezone: profile.timezone,
        }
      : null,
    goal: goal
      ? {
          bmrKcal: goal.bmrKcal,
          tdeeKcal: goal.tdeeKcal,
          caloriesKcal: goal.caloriesKcal,
          proteinG: goal.proteinG,
          carbsG: goal.carbsG,
          fatG: goal.fatG,
          fibreG: goal.fibreG,
          waterMl: goal.waterMl,
          steps: goal.steps,
          exerciseMinutes: goal.exerciseMinutes,
          weeklyWeightChangeG: goal.weeklyWeightChangeG,
          overriddenFields: goal.overriddenFields,
          safetyLevel: goal.safetyLevel,
        }
      : null,
    meals: meals.map((m) => ({
      id: m.id,
      name: m.name,
      quantity: m.quantity,
      unit: m.unit,
      mealType: m.mealType,
      loggedAt: isoOrEmpty(m.loggedAt),
      dataSource: m.dataSource,
      confidence: m.confidence,
      energyKcal: m.energyKcal,
      proteinG: m.proteinG,
      carbsG: m.carbsG,
      fatG: m.fatG,
      fibreG: m.fibreG,
      sugarG: m.sugarG,
      sodiumMg: m.sodiumMg,
      isFavorite: m.isFavorite,
      deletedAt: isoOrEmpty(m.deletedAt),
      items: m.items.map((i) => ({
        name: i.name,
        grams: i.grams,
        proportionPct: i.proportionPct,
        dataSource: i.dataSource,
        energyKcal: i.energyKcal,
        proteinG: i.proteinG,
        carbsG: i.carbsG,
        fatG: i.fatG,
        fibreG: i.fibreG,
        sugarG: i.sugarG,
        sodiumMg: i.sodiumMg,
      })),
    })),
    exercise: exercise.map((e) => ({
      id: e.id,
      type: e.type,
      customLabel: e.customLabel,
      durationMin: e.durationMin,
      intensity: e.intensity,
      distanceM: e.distanceM,
      sets: e.sets,
      reps: e.reps,
      loadG: e.weightG,
      notes: e.notes,
      estimatedKcal: e.estimatedKcal,
      metUsed: e.metUsed,
      bodyWeightKgUsed: e.weightKgUsed,
      performedAt: isoOrEmpty(e.performedAt),
      deletedAt: isoOrEmpty(e.deletedAt),
    })),
    water: water.map((w) => ({
      id: w.id,
      amountMl: w.amountMl,
      loggedAt: isoOrEmpty(w.loggedAt),
      deletedAt: isoOrEmpty(w.deletedAt),
    })),
    weight: weight.map((w) => ({
      id: w.id,
      weightG: w.weightG,
      recordedAt: isoOrEmpty(w.recordedAt),
      note: w.note,
      deletedAt: isoOrEmpty(w.deletedAt),
    })),
    fasting: fasting.map((f) => ({
      id: f.id,
      startedAt: isoOrEmpty(f.startedAt),
      endedAt: isoOrEmpty(f.endedAt),
      plannedDurationMin: f.plannedDurationMin,
      protocolLabel: f.protocolLabel,
      notes: f.notes,
      deletedAt: isoOrEmpty(f.deletedAt),
    })),
    glucose: glucose.map((g) => ({
      id: g.id,
      valueMgDl: g.valueMgDl,
      measuredAt: isoOrEmpty(g.measuredAt),
      context: g.context,
      note: g.note,
      deletedAt: isoOrEmpty(g.deletedAt),
    })),
    aiInteractions: aiInteractions.map((a) => ({
      id: a.id,
      providerId: a.providerId,
      model: a.model,
      purpose: a.purpose,
      status: a.status,
      errorCode: a.errorCode,
      confidence: a.confidence,
      createdAt: isoOrEmpty(a.createdAt),
    })),
  };
}

/** One CSV table per log type. Nested meal items are dropped — see the JSON export. */
export function exportTables(data: UserExport): ExportTable[] {
  const table = (
    name: string,
    rows: Record<string, unknown>[],
    columns: string[],
  ): ExportTable => ({
    name,
    columns,
    rows: rows.map((row) => columns.map((c) => row[c] as never)),
  });

  return [
    table("meals", data.meals, [
      "loggedAt",
      "mealType",
      "name",
      "quantity",
      "unit",
      "energyKcal",
      "proteinG",
      "carbsG",
      "fatG",
      "fibreG",
      "sugarG",
      "sodiumMg",
      "dataSource",
      "confidence",
      "deletedAt",
    ]),
    table("exercise", data.exercise, [
      "performedAt",
      "type",
      "customLabel",
      "durationMin",
      "intensity",
      "estimatedKcal",
      "distanceM",
      "sets",
      "reps",
      "loadG",
      "notes",
      "deletedAt",
    ]),
    table("water", data.water, ["loggedAt", "amountMl", "deletedAt"]),
    table("weight", data.weight, [
      "recordedAt",
      "weightG",
      "note",
      "deletedAt",
    ]),
    table("fasting", data.fasting, [
      "startedAt",
      "endedAt",
      "plannedDurationMin",
      "protocolLabel",
      "notes",
      "deletedAt",
    ]),
    table("glucose", data.glucose, [
      "measuredAt",
      "valueMgDl",
      "context",
      "note",
      "deletedAt",
    ]),
  ];
}
