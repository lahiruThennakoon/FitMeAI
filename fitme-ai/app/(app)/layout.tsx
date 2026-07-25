import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";

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
  return children;
}
