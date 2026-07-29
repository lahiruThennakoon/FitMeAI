import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { listRecentGlucoseEntriesForUser } from "@/lib/dal/glucose-entry";
import { getProfileForUser } from "@/lib/dal/profile";
import { AppPageShell } from "@/components/app-page-shell";
import { ShowMoreLink } from "@/components/show-more-link";
import {
  fetchLimit,
  parseHistoryLimit,
  sliceHistoryPage,
} from "@/lib/domain/history/paging";
import { GlucoseList } from "./glucose-list";
import { GlucoseLogForm } from "./glucose-log-form";

type PageProps = {
  searchParams?: Promise<{ show?: string }>;
};

/**
 * Blood glucose logging (Epic 8).
 */
export default async function GlucosePage({ searchParams }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");

  const params = searchParams ? await searchParams : {};
  const limit = parseHistoryLimit(params.show);

  const [rows, profile] = await Promise.all([
    listRecentGlucoseEntriesForUser(user.id, fetchLimit(limit)),
    getProfileForUser(user.id),
  ]);
  const page = sliceHistoryPage(rows, limit);
  const displayUnit = profile?.preferredGlucoseUnit ?? "mg_dl";

  return (
    <AppPageShell
      eyebrow="Glucose"
      emoji="🩸"
      title="Blood sugar log"
      description="Your own measurements, logged for personal awareness — not diagnosis or treatment."
    >
      <GlucoseLogForm defaultUnit={displayUnit} />

      <section
        className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
        aria-label="Recent readings"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Recent readings
        </p>
        <div className="mt-3">
          <GlucoseList entries={page.items} displayUnit={displayUnit} />
        </div>
        {page.hasMore ? (
          <ShowMoreLink
            href={`/glucose?show=${page.nextLimit}`}
            shown={page.items.length}
            label="readings"
          />
        ) : null}
      </section>

      <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        Personal tracker only. FitMe does not interpret readings as medical
        conditions or recommend medication changes.
      </p>
    </AppPageShell>
  );
}
