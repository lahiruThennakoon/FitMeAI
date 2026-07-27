import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { getGoalForUser, getProfileForUser } from "@/lib/dal/profile";
import { listRecentWeightEntriesForUser } from "@/lib/dal/weight-entry";
import { AppPageShell } from "@/components/app-page-shell";
import { GoalsForm } from "./goals-form";
import { WeightCheckIn } from "./weight-check-in";

export default async function GoalsPage() {
  const user = await getSession();
  // Layout already guards; redirect keeps the type narrow for DAL calls.
  if (!user) redirect("/login");

  const [profile, goal, recentWeights] = await Promise.all([
    getProfileForUser(user.id),
    getGoalForUser(user.id),
    listRecentWeightEntriesForUser(user.id),
  ]);

  return (
    <AppPageShell
      eyebrow="Profile"
      emoji="👤"
      title={profile ? "Profile & targets" : "Set up your profile"}
      description="We'll suggest daily targets from your details using a published formula you can see and adjust."
    >
      {profile ? (
        <WeightCheckIn
          preferredUnits={profile.preferredUnits}
          currentWeightG={profile.currentWeightG}
          targetWeightG={profile.targetWeightG}
          recent={recentWeights}
        />
      ) : null}
      <GoalsForm initialProfile={profile} initialGoal={goal} />
    </AppPageShell>
  );
}
