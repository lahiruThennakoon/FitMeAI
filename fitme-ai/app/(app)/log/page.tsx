import { InstantLog } from "./instant-log";
import { LogMealForm } from "./log-meal-form";

/**
 * Natural-language food logging (Story 2.3 / FR-6) + instant-path (4.1).
 * Auth enforced by (app) layout.
 */
export default function LogPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-5 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium text-brand-blue">Log food</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          What did you eat?
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Describe your meal in plain language, or tap a cached food for an
          instant log — nothing AI-parsed is saved until you confirm.
        </p>
      </header>
      <InstantLog />
      <LogMealForm />
    </main>
  );
}
