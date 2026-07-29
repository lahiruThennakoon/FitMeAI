"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveDisplayPreferencesAction } from "@/app/actions/profile";
import type { GlucoseDisplayUnit } from "@/lib/domain/glucose/units";
import type { PreferredUnits } from "@/lib/domain/targets/units";

const selectClass =
  "h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base outline-none ring-brand-blue/30 focus-visible:ring-2 dark:border-neutral-700 dark:bg-neutral-950";

type Props = {
  preferredUnits: PreferredUnits;
  preferredGlucoseUnit: GlucoseDisplayUnit;
  timezone: string;
};

/** Timezones the browser knows about, so this stays a picker rather than free text. */
function useTimezoneOptions(current: string): string[] {
  return useMemo(() => {
    let zones: string[] = [];
    try {
      if (
        typeof Intl !== "undefined" &&
        "supportedValuesOf" in Intl &&
        typeof Intl.supportedValuesOf === "function"
      ) {
        zones = Intl.supportedValuesOf("timeZone");
      }
    } catch {
      zones = [];
    }
    if (!zones.includes(current)) zones = [current, ...zones];
    return zones;
  }, [current]);
}

export function DisplayPreferencesForm({
  preferredUnits,
  preferredGlucoseUnit,
  timezone,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [units, setUnits] = useState<PreferredUnits>(preferredUnits);
  const [glucoseUnit, setGlucoseUnit] =
    useState<GlucoseDisplayUnit>(preferredGlucoseUnit);
  const [zone, setZone] = useState(timezone);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const zones = useTimezoneOptions(timezone);

  const dirty =
    units !== preferredUnits ||
    glucoseUnit !== preferredGlucoseUnit ||
    zone !== timezone;

  const detected = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return null;
    }
  }, []);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      try {
        const result = await saveDisplayPreferencesAction({
          preferredUnits: units,
          preferredGlucoseUnit: glucoseUnit,
          timezone: zone,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSaved(true);
        router.refresh();
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <span className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Measurement units
        </span>
        <div className="flex gap-2">
          {(["metric", "imperial"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setUnits(option)}
              aria-pressed={units === option}
              className={`h-11 flex-1 rounded-xl border px-4 text-sm font-medium capitalize transition ${
                units === option
                  ? "border-brand-blue bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/20"
                  : "border-neutral-300 text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-600"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {units === "metric"
            ? "Weight in kg, height in cm, water in ml, distance in km."
            : "Weight in lb, height in feet and inches, water in fl oz, distance in miles."}{" "}
          Your saved numbers don&apos;t change — only how they&apos;re shown.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="settings-glucose-unit"
          className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
        >
          Blood sugar unit
        </label>
        <select
          id="settings-glucose-unit"
          value={glucoseUnit}
          onChange={(e) =>
            setGlucoseUnit(e.target.value as GlucoseDisplayUnit)
          }
          className={selectClass}
        >
          <option value="mg_dl">mg/dL</option>
          <option value="mmol_l">mmol/L</option>
        </select>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="settings-timezone"
          className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
        >
          Timezone
        </label>
        <select
          id="settings-timezone"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className={selectClass}
        >
          {zones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Decides where each day starts and ends on your dashboard and charts.
          {detected && detected !== zone ? (
            <>
              {" "}
              This device says{" "}
              <button
                type="button"
                onClick={() => setZone(detected)}
                className="font-medium text-brand-blue underline decoration-dotted"
              >
                {detected}
              </button>
              .
            </>
          ) : null}
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {saved && !dirty ? (
        <p role="status" className="text-sm text-brand-green">
          Preferences saved.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !dirty}
        className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-blue px-6 text-base font-medium text-white shadow-sm transition hover:bg-brand-blue/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
