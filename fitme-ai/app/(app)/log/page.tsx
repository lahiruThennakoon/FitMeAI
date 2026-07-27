import { AppPageShell } from "@/components/app-page-shell";
import { getSession } from "@/lib/dal";
import {
  listFavoriteFoodTemplates,
  listRecentFoodTemplates,
} from "@/lib/dal/food-template";
import { InstantLog } from "./instant-log";
import { LogMealForm } from "./log-meal-form";
import { RecentFavorites } from "./recent-favorites";

/**
 * Natural-language food logging (Story 2.3 / FR-6) + instant-path (4.1)
 * + recent/favorites re-log (5.5). Auth enforced by (app) layout.
 */
export default async function LogPage() {
  const user = await getSession();
  const [recent, favorites] = user
    ? await Promise.all([
        listRecentFoodTemplates(user.id),
        listFavoriteFoodTemplates(user.id),
      ])
    : [[], []];

  return (
    <AppPageShell
      eyebrow="Log food"
      emoji="🍽️"
      title="What did you eat?"
      description="Re-log a recent meal, tap a cached food, or describe something new. Nothing AI-parsed is saved until you confirm."
    >
      <RecentFavorites recent={recent} favorites={favorites} />
      <InstantLog />
      <LogMealForm />
    </AppPageShell>
  );
}
