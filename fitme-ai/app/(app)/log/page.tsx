import { AppPageShell } from "@/components/app-page-shell";
import { getSession } from "@/lib/dal";
import {
  listFavoriteFoodTemplates,
  listRecentFoodTemplates,
} from "@/lib/dal/food-template";
import { getProfileForUser } from "@/lib/dal/profile";
import {
  previousZonedDayKey,
  zonedDayBounds,
} from "@/lib/domain/dashboard/day-bounds";
import { LogPageContent } from "./log-page-content";

/**
 * Natural-language food logging (Story 2.3 / FR-6) + instant-path (4.1)
 * + recent/favorites re-log (5.5) + copy a past day. Auth by (app) layout.
 */
export default async function LogPage() {
  const user = await getSession();
  const [recent, favorites, profile] = user
    ? await Promise.all([
        listRecentFoodTemplates(user.id),
        listFavoriteFoodTemplates(user.id),
        getProfileForUser(user.id),
      ])
    : [[], [], null];

  const timeZone = profile?.timezone ?? "UTC";
  const yesterdayKey = previousZonedDayKey(
    zonedDayBounds(new Date(), timeZone).dayKey,
    timeZone,
  );

  return (
    <AppPageShell
      eyebrow="Log food"
      emoji="🍽️"
      title="What did you eat?"
      description="Pick a recent meal to review, copy a past day, tap a cached food, or describe something new. Nothing is saved until you confirm."
    >
      <LogPageContent
        recent={recent}
        favorites={favorites}
        yesterdayKey={yesterdayKey}
      />
    </AppPageShell>
  );
}
