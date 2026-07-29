import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { getGoalForUser, getProfileForUser } from "@/lib/dal/profile";
import { listRecentWeightEntriesForUser } from "@/lib/dal/weight-entry";
import { AppPageShell } from "@/components/app-page-shell";
import { ShowMoreLink } from "@/components/show-more-link";
import {
  fetchLimit,
  parseHistoryLimit,
  sliceHistoryPage,
} from "@/lib/domain/history/paging";
import { GoalsForm } from "./goals-form";
import { WeightCheckIn } from "./weight-check-in";

type PageProps = {
  searchParams?: Promise<{ show?: string }>;
};

export default async function GoalsPage({ searchParams }: PageProps) {
  const user = await getSession();
  // Layout already guards; redirect keeps the type narrow for DAL calls.
  if (!user) redirect("/login");

  const params = searchParams ? await searchParams : {};
  const limit = parseHistoryLimit(params.show);

  const [profile, goal, weightRows] = await Promise.all([
    getProfileForUser(user.id),
    getGoalForUser(user.id),
    listRecentWeightEntriesForUser(user.id, fetchLimit(limit)),
  ]);
  const weightPage = sliceHistoryPage(weightRows, limit);
  const recentWeights = weightPage.items;
  const showMoreWeights = weightPage.hasMore ? (
    <ShowMoreLink
      href={`/goals?show=${weightPage.nextLimit}`}
      shown={recentWeights.length}
      label="weigh-ins"
    />
  ) : null;

  return (
    <AppPageShell
      eyebrow="Profile"
      emoji="👤"
      title={profile ? "Profile & targets" : "Set up your profile"}
      description="We'll suggest daily targets from your details using a published formula you can see and adjust."
    >
      {profile && goal ? (
        <WeightCheckIn
          preferredUnits={profile.preferredUnits}
          currentWeightG={profile.currentWeightG}
          targetWeightG={profile.targetWeightG}
          plannedWeeklyChangeG={goal.weeklyWeightChangeG}
          weeklyChangeOverridden={goal.overriddenFields.includes(
            "weeklyWeightChangeG",
          )}
          recent={recentWeights}
          showMore={showMoreWeights}
        />
      ) : profile ? (
        <WeightCheckIn
          preferredUnits={profile.preferredUnits}
          currentWeightG={profile.currentWeightG}
          targetWeightG={profile.targetWeightG}
          plannedWeeklyChangeG={0}
          weeklyChangeOverridden={false}
          recent={recentWeights}
          showMore={showMoreWeights}
        />
      ) : null}
      <GoalsForm initialProfile={profile} initialGoal={goal} />
    </AppPageShell>
  );
}
