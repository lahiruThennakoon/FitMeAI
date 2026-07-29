import { getSession } from "@/lib/dal";
import { getProfileForUser } from "@/lib/dal/profile";
import { gToKg } from "@/lib/domain/targets/units";
import { AppPageShell } from "@/components/app-page-shell";
import { ExerciseForm } from "./exercise-form";

/**
 * Manual exercise logging (Story 3.2 / FR-14).
 */
export default async function ExercisePage() {
  const user = await getSession();
  const profile = user ? await getProfileForUser(user.id) : null;
  const weightKg = profile ? gToKg(profile.currentWeightG) : null;

  return (
    <AppPageShell
      eyebrow="Exercise"
      emoji="🔥"
      title="Log a workout"
      description="Add type, duration, and intensity. Burn is an estimate — not an exact measurement."
    >
      <ExerciseForm
        weightKg={weightKg}
        units={profile?.preferredUnits ?? "metric"}
      />
    </AppPageShell>
  );
}
