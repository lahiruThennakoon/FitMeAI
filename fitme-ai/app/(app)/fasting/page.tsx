import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import {
  getActiveFastingSession,
  listRecentFastingSessions,
} from "@/lib/dal/fasting-session";
import { AppPageShell } from "@/components/app-page-shell";
import { ShowMoreLink } from "@/components/show-more-link";
import {
  fetchLimit,
  parseHistoryLimit,
  sliceHistoryPage,
} from "@/lib/domain/history/paging";
import { FastingControl } from "./fasting-control";
import { FastingHistoryList } from "./fasting-history-list";

type PageProps = {
  searchParams?: Promise<{ show?: string }>;
};

/**
 * Fasting start/stop + history (Stories 7.1–7.3).
 */
export default async function FastingPage({ searchParams }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");

  const params = searchParams ? await searchParams : {};
  const limit = parseHistoryLimit(params.show);

  const [active, rows] = await Promise.all([
    getActiveFastingSession(user.id),
    listRecentFastingSessions(user.id, fetchLimit(limit)),
  ]);
  const page = sliceHistoryPage(rows, limit);

  // Seed the client timer from the server instant so the first render matches.
  const now = new Date();

  return (
    <AppPageShell
      eyebrow="Fasting"
      emoji="⏳"
      title="Fasting timer"
      description="Track a fasting window at your own pace. Ending early is fine — this is just a clock."
    >
      <FastingControl active={active} nowMs={now.getTime()} />

      <section
        className="rounded-2xl border border-neutral-200/80 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
        aria-label="Fasting history"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          History
        </p>
        <div className="mt-3">
          <FastingHistoryList sessions={page.items} />
        </div>
        {page.hasMore ? (
          <ShowMoreLink
            href={`/fasting?show=${page.nextLimit}`}
            shown={page.items.length}
            label="fasts"
          />
        ) : null}
      </section>
    </AppPageShell>
  );
}
