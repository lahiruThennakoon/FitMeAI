"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfileAction } from "@/app/actions/profile";
import {
  ACTIVITY_MULTIPLIERS,
  MIFFLIN_ST_JEOR_FORMULA,
  type ActivityLevel,
  type Sex,
} from "@/lib/domain/targets/bmr";
import {
  mergeOverrides,
  suggestTargets,
  type GoalType,
} from "@/lib/domain/targets/suggest-targets";
import {
  displayHeight,
  displayMass,
  displayWater,
  gToKg,
  parseHeightToCm,
  parseMassToG,
  type PreferredUnits,
} from "@/lib/domain/targets/units";
import type { GoalDto, ProfileDto } from "@/lib/domain/targets/types";

type Props = {
  initialProfile: ProfileDto | null;
  initialGoal: GoalDto | null;
};

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentary (little or no exercise)" },
  { value: "lightly_active", label: "Lightly active (1–3 days/week)" },
  { value: "moderately_active", label: "Moderately active (3–5 days/week)" },
  { value: "very_active", label: "Very active (6–7 days/week)" },
  { value: "extra_active", label: "Extra active (physical job / 2× training)" },
];

const GOAL_OPTIONS: { value: GoalType; label: string }[] = [
  { value: "weight_loss", label: "Weight loss" },
  { value: "maintenance", label: "Maintain weight" },
  { value: "muscle_gain", label: "Muscle gain" },
  { value: "general_health", label: "General health" },
];

function defaultTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function GoalsForm({ initialProfile, initialGoal }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [units, setUnits] = useState<PreferredUnits>(
    initialProfile?.preferredUnits ?? "metric",
  );
  const [displayName, setDisplayName] = useState(
    initialProfile?.displayName ?? "",
  );
  const [ageYears, setAgeYears] = useState(
    String(initialProfile?.ageYears ?? ""),
  );
  const [sex, setSex] = useState<Sex>(initialProfile?.sex ?? "female");
  const [height, setHeight] = useState(
    initialProfile
      ? String(displayHeight(initialProfile.heightCm, units))
      : "",
  );
  const [currentWeight, setCurrentWeight] = useState(
    initialProfile
      ? String(displayMass(initialProfile.currentWeightG, units))
      : "",
  );
  const [targetWeight, setTargetWeight] = useState(
    initialProfile
      ? String(displayMass(initialProfile.targetWeightG, units))
      : "",
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initialProfile?.activityLevel ?? "moderately_active",
  );
  const [dietaryText, setDietaryText] = useState(
    (initialProfile?.dietaryPreferences ?? []).join(", "),
  );
  const [goalType, setGoalType] = useState<GoalType>(
    initialProfile?.goalType ?? "general_health",
  );
  const [country, setCountry] = useState(initialProfile?.country ?? "");
  const [timezone, setTimezone] = useState(
    initialProfile?.timezone ?? defaultTimezone(),
  );
  const [calorieOverride, setCalorieOverride] = useState(
    initialGoal?.overriddenFields.includes("caloriesKcal")
      ? String(initialGoal.caloriesKcal)
      : "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function switchUnits(next: PreferredUnits) {
    if (next === units) return;
    const h = Number(height);
    const cw = Number(currentWeight);
    const tw = Number(targetWeight);
    if (Number.isFinite(h) && h > 0) {
      const cm = parseHeightToCm(h, units);
      setHeight(String(displayHeight(cm, next)));
    }
    if (Number.isFinite(cw) && cw > 0) {
      const g = parseMassToG(cw, units);
      setCurrentWeight(String(displayMass(g, next)));
    }
    if (Number.isFinite(tw) && tw > 0) {
      const g = parseMassToG(tw, units);
      setTargetWeight(String(displayMass(g, next)));
    }
    setUnits(next);
  }

  const live = useMemo(() => {
    const age = Number(ageYears);
    const h = Number(height);
    const cw = Number(currentWeight);
    const tw = Number(targetWeight);
    if (
      !Number.isFinite(age) ||
      age < 13 ||
      !Number.isFinite(h) ||
      h <= 0 ||
      !Number.isFinite(cw) ||
      cw <= 0 ||
      !Number.isFinite(tw) ||
      tw <= 0
    ) {
      return null;
    }
    const suggested = suggestTargets({
      weightG: parseMassToG(cw, units),
      heightCm: parseHeightToCm(h, units),
      ageYears: age,
      sex,
      activityLevel,
      goalType,
      targetWeightG: parseMassToG(tw, units),
    });
    const overrideKcal = Number(calorieOverride);
    const effective = mergeOverrides(
      suggested,
      Number.isFinite(overrideKcal) && calorieOverride.trim() !== ""
        ? { caloriesKcal: Math.round(overrideKcal) }
        : {},
    );
    return {
      suggested,
      effective,
      multiplier: ACTIVITY_MULTIPLIERS[activityLevel],
      weightKg: gToKg(parseMassToG(cw, units)),
    };
  }, [
    ageYears,
    height,
    currentWeight,
    targetWeight,
    units,
    sex,
    activityLevel,
    goalType,
    calorieOverride,
  ]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSavedMessage(null);

    const overrides =
      calorieOverride.trim() !== "" && Number.isFinite(Number(calorieOverride))
        ? { caloriesKcal: Math.round(Number(calorieOverride)) }
        : undefined;

    startTransition(async () => {
      try {
        const result = await saveProfileAction({
          displayName,
          ageYears: Number(ageYears),
          sex,
          height: Number(height),
          currentWeight: Number(currentWeight),
          targetWeight: Number(targetWeight),
          activityLevel,
          dietaryPreferences: dietaryText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          goalType,
          preferredUnits: units,
          country,
          timezone,
          overrides,
        });
        if (!result.ok) {
          setFormError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
          return;
        }
        setSavedMessage("Profile and targets saved.");
        router.refresh();
      } catch {
        setFormError("Something went wrong. Please try again.");
      }
    });
  }

  const heightUnit = units === "metric" ? "cm" : "in";
  const massUnit = units === "metric" ? "kg" : "lb";
  const waterUnit = units === "metric" ? "ml" : "fl oz";

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold">Your details</legend>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => switchUnits("metric")}
            className={`h-12 flex-1 rounded-xl text-sm font-medium ring-1 ring-inset ${
              units === "metric"
                ? "bg-brand-blue text-white ring-brand-blue"
                : "text-brand-blue ring-brand-blue/30"
            }`}
          >
            Metric
          </button>
          <button
            type="button"
            onClick={() => switchUnits("imperial")}
            className={`h-12 flex-1 rounded-xl text-sm font-medium ring-1 ring-inset ${
              units === "imperial"
                ? "bg-brand-blue text-white ring-brand-blue"
                : "text-brand-blue ring-brand-blue/30"
            }`}
          >
            Imperial
          </button>
        </div>

        <Field
          id="displayName"
          label="Name"
          error={fieldErrors.displayName}
          value={displayName}
          onChange={setDisplayName}
          autoComplete="name"
        />
        <Field
          id="ageYears"
          label="Age"
          type="number"
          error={fieldErrors.ageYears}
          value={ageYears}
          onChange={setAgeYears}
        />
        <div className="space-y-2">
          <label htmlFor="sex" className="block text-sm font-medium">
            Sex (for BMR formula)
          </label>
          <select
            id="sex"
            value={sex}
            onChange={(e) => setSex(e.target.value as Sex)}
            className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base dark:border-neutral-700 dark:bg-neutral-950"
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>
        <Field
          id="height"
          label={`Height (${heightUnit})`}
          type="number"
          error={fieldErrors.height}
          value={height}
          onChange={setHeight}
          step="any"
        />
        <Field
          id="currentWeight"
          label={`Current weight (${massUnit})`}
          type="number"
          error={fieldErrors.currentWeight}
          value={currentWeight}
          onChange={setCurrentWeight}
          step="any"
        />
        <Field
          id="targetWeight"
          label={`Target weight (${massUnit})`}
          type="number"
          error={fieldErrors.targetWeight}
          value={targetWeight}
          onChange={setTargetWeight}
          step="any"
        />
        <div className="space-y-2">
          <label htmlFor="activityLevel" className="block text-sm font-medium">
            Activity level
          </label>
          <select
            id="activityLevel"
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
            className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base dark:border-neutral-700 dark:bg-neutral-950"
          >
            {ACTIVITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="goalType" className="block text-sm font-medium">
            Goal type
          </label>
          <select
            id="goalType"
            value={goalType}
            onChange={(e) => setGoalType(e.target.value as GoalType)}
            className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base dark:border-neutral-700 dark:bg-neutral-950"
          >
            {GOAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <Field
          id="dietaryPreferences"
          label="Dietary preferences (comma-separated)"
          error={fieldErrors.dietaryPreferences}
          value={dietaryText}
          onChange={setDietaryText}
          hint="Optional — e.g. vegetarian, halal"
        />
        <Field
          id="country"
          label="Country"
          error={fieldErrors.country}
          value={country}
          onChange={setCountry}
        />
        <Field
          id="timezone"
          label="Timezone"
          error={fieldErrors.timezone}
          value={timezone}
          onChange={setTimezone}
          hint="Used for day boundaries (stored for later features)"
        />
      </fieldset>

      <section
        aria-labelledby="formula-heading"
        className="space-y-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
      >
        <h2 id="formula-heading" className="text-base font-semibold">
          How we estimate your targets
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          These are estimates, not medical advice. Talk to a professional for
          personal health guidance.
        </p>
        <ul className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
          <li>
            {sex === "male"
              ? MIFFLIN_ST_JEOR_FORMULA.male
              : MIFFLIN_ST_JEOR_FORMULA.female}
          </li>
          <li>{MIFFLIN_ST_JEOR_FORMULA.tdee}</li>
          <li>
            Activity multiplier for {activityLevel.replaceAll("_", " ")}:{" "}
            {ACTIVITY_MULTIPLIERS[activityLevel]}
          </li>
          {live ? (
            <li>
              Inputs: {live.weightKg.toFixed(1)} kg · {Number(height)} {heightUnit}{" "}
              · age {ageYears} · {sex}
            </li>
          ) : null}
        </ul>
      </section>

      <section
        aria-labelledby="targets-heading"
        className="space-y-4 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
      >
        <h2 id="targets-heading" className="text-base font-semibold">
          Suggested daily targets
        </h2>
        {live ? (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <TargetStat label="BMR" value={`${live.effective.bmrKcal} kcal`} />
              <TargetStat label="TDEE" value={`${live.effective.tdeeKcal} kcal`} />
              <TargetStat
                label="Calories"
                value={`${live.effective.caloriesKcal} kcal`}
              />
              <TargetStat label="Protein" value={`${live.effective.proteinG} g`} />
              <TargetStat label="Carbs" value={`${live.effective.carbsG} g`} />
              <TargetStat label="Fat" value={`${live.effective.fatG} g`} />
              <TargetStat label="Fibre" value={`${live.effective.fibreG} g`} />
              <TargetStat
                label="Water"
                value={`${displayWater(live.effective.waterMl, units)} ${waterUnit}`}
              />
              <TargetStat label="Steps" value={`${live.effective.steps}`} />
              <TargetStat
                label="Exercise"
                value={`${live.effective.exerciseMinutes} min`}
              />
              <TargetStat
                label="Weekly weight change"
                value={`${displayMass(Math.abs(live.effective.weeklyWeightChangeG), units)} ${massUnit}/wk ${
                  live.effective.weeklyWeightChangeG < 0
                    ? "loss"
                    : live.effective.weeklyWeightChangeG > 0
                      ? "gain"
                      : ""
                }`}
              />
            </dl>
            <Field
              id="calorieOverride"
              label="Override calories (optional)"
              type="number"
              value={calorieOverride}
              onChange={setCalorieOverride}
              hint={`Suggested: ${live.suggested.caloriesKcal} kcal — leave blank to use suggestion`}
            />
          </>
        ) : (
          <p className="text-sm text-neutral-500">
            Fill in age, height, and weight to see live suggestions.
          </p>
        )}
      </section>

      {formError ? (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      ) : null}
      {savedMessage ? (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          {savedMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="brand-gradient inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-base font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile & targets"}
      </button>
    </form>
  );
}

function Field(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
  hint?: string;
  step?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={props.id} className="block text-sm font-medium">
        {props.label}
      </label>
      <input
        id={props.id}
        name={props.id}
        type={props.type ?? "text"}
        step={props.step}
        autoComplete={props.autoComplete}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={Boolean(props.error)}
        aria-describedby={
          props.error ? `${props.id}-error` : props.hint ? `${props.id}-hint` : undefined
        }
        className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base outline-none ring-brand-blue/30 focus-visible:ring-2 dark:border-neutral-700 dark:bg-neutral-950"
      />
      {props.error ? (
        <p id={`${props.id}-error`} role="alert" className="text-sm text-red-600">
          {props.error}
        </p>
      ) : props.hint ? (
        <p id={`${props.id}-hint`} className="text-sm text-neutral-500">
          {props.hint}
        </p>
      ) : null}
    </div>
  );
}

function TargetStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
