import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { getActiveFastingSession } from "@/lib/dal/fasting-session";
import { AppPageShell } from "@/components/app-page-shell";
import { FastingControl } from "./fasting-control";

/**
 * Fasting start/stop (Story 7.1). History list lands in 7.3.
 */
export default async function FastingPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const active = await getActiveFastingSession(user.id);

  return (
    <AppPageShell
      eyebrow="Fasting"
      emoji="⏳"
      title="Fasting timer"
      description="Track a fasting window at your own pace. Ending early is fine — this is just a clock."
    >
      <FastingControl active={active} />
    </AppPageShell>
  );
}
