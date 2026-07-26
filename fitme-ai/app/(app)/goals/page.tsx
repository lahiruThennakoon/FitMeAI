import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { getGoalForUser, getProfileForUser } from "@/lib/dal/profile";
import { AppPageShell } from "@/components/app-page-shell";
import { GoalsForm } from "./goals-form";

export default async function GoalsPage() {
  const user = await getSession();
  // Layout already guards; redirect keeps the type narrow for DAL calls.
  if (!user) redirect("/login");

  const [profile, goal] = await Promise.all([
    getProfileForUser(user.id),
    getGoalForUser(user.id),
  ]);

  return (
    <AppPageShell
      eyebrow="Profile"
      emoji="👤"
      title={profile ? "Profile & targets" : "Set up your profile"}
      description="We'll suggest daily targets from your details using a published formula you can see and adjust."
    >
      <GoalsForm initialProfile={profile} initialGoal={goal} />
    </AppPageShell>
  );
}
