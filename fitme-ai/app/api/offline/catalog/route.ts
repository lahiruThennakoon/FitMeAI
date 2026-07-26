import { NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { listActiveFoodEntriesForUser } from "@/lib/dal/food-entry";
import { listFoodsForOfflineCache } from "@/lib/dal/nutrition";

/**
 * Catalog + recent slugs for client offline cache (Story 4.1).
 * Safe to cache in the service worker (no secrets in body).
 */
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [foods, entries] = await Promise.all([
    listFoodsForOfflineCache(40),
    listActiveFoodEntriesForUser(user.id),
  ]);

  const recentSlugs: string[] = [];
  for (const e of entries.slice(0, 30)) {
    const slug = e.food?.slug;
    if (slug && !recentSlugs.includes(slug)) recentSlugs.push(slug);
  }

  return NextResponse.json(
    {
      foods,
      recentSlugs,
      cachedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    },
  );
}
