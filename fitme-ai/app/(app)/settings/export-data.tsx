import { btnClass } from "@/lib/ui/buttons";

const CSV_TABLES = [
  { table: "meals", label: "Meals" },
  { table: "exercise", label: "Workouts" },
  { table: "water", label: "Water" },
  { table: "weight", label: "Weigh-ins" },
  { table: "fasting", label: "Fasts" },
  { table: "glucose", label: "Blood sugar" },
] as const;

/**
 * Plain links, not fetch + blob: the browser's own download handling is more
 * reliable, works with the session cookie, and needs no client JS.
 */
export function ExportData() {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        Download everything we hold for you, including entries you deleted (each
        one keeps the date you removed it). Numbers are in the units we store —
        grams, millilitres, centimetres, metres and mg/dL — with the unit named
        in every column.
      </p>

      <div>
        <a
          href="/api/export?format=json"
          download
          className={btnClass("solid-blue")}
        >
          Download everything (JSON)
        </a>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          One complete file, including the ingredient breakdown of each meal.
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Or one log at a time, for a spreadsheet
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {CSV_TABLES.map(({ table, label }) => (
            <li key={table}>
              <a
                href={`/api/export?format=csv&table=${table}`}
                download
                className={btnClass("secondary", { size: "sm", className: "px-3" })}
              >
                {label} .csv
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
