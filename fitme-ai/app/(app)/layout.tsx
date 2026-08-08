import { redirect } from "next/navigation";
import { AppAuthenticatedShell } from "@/components/app-authenticated-shell";
import { getSession } from "@/lib/dal";
import { hasAnyFoodEntriesForUser } from "@/lib/dal/food-entry";

/**
 * Auth choke-point for all authenticated app routes (AD-1 / AD-6).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  const hasEverLoggedMeal = await hasAnyFoodEntriesForUser(user.id);
  return (
    <AppAuthenticatedShell highlightLogNav={!hasEverLoggedMeal}>
      {children}
    </AppAuthenticatedShell>
  );
}
