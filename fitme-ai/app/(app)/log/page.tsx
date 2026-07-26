import { AppPageShell } from "@/components/app-page-shell";
import { InstantLog } from "./instant-log";
import { LogMealForm } from "./log-meal-form";

/**
 * Natural-language food logging (Story 2.3 / FR-6) + instant-path (4.1).
 * Auth enforced by (app) layout.
 */
export default function LogPage() {
  return (
    <AppPageShell
      eyebrow="Log food"
      emoji="🍽️"
      title="What did you eat?"
      description="Describe your meal in plain words, or tap a cached food for a quick log. Nothing AI-parsed is saved until you confirm."
    >
      <InstantLog />
      <LogMealForm />
    </AppPageShell>
  );
}
