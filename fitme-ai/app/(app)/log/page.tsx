import { AppPageShell } from "@/components/app-page-shell";
import { getSession } from "@/lib/dal";
import { getEntitlements } from "@/lib/dal/entitlements";
import {
  listFavoriteFoodTemplates,
  listRecentFoodTemplates,
} from "@/lib/dal/food-template";
import { LogPageContent } from "./log-page-content";

/**
 * Natural-language food logging (Story 2.3 / FR-6) + instant-path (4.1)
 * + recent/favorites re-log (5.5). Auth by (app) layout.
 */
export default async function LogPage() {
  const user = await getSession();
  const [recent, favorites, entitlements] = user
    ? await Promise.all([
        listRecentFoodTemplates(user.id),
        listFavoriteFoodTemplates(user.id),
        getEntitlements(user.id),
      ])
    : [[], [], null];

  return (
    <AppPageShell
      eyebrow="Log food"
      emoji="🍽️"
      title="What did you eat?"
      description="Pick a recent meal, search the catalog, tap a cached staple, or describe something new. Nothing is saved until you confirm."
    >
      <LogPageContent
        recent={recent}
        favorites={favorites}
        aiParsesRemaining={entitlements?.aiParsesRemaining ?? null}
        freePlan={entitlements?.plan === "free"}
      />
    </AppPageShell>
  );
}
