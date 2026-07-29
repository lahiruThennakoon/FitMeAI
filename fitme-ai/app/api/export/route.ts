import { NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { exportTables, getUserExport } from "@/lib/dal/export";
import {
  contentDisposition,
  exportFilenameStem,
  toCsv,
} from "@/lib/domain/export/serialize";

/**
 * Personal data export (Tier 3).
 *
 * `?format=json` returns everything in one file, including nested meal items.
 * `?format=csv&table=meals` returns one flat log so it opens straight in a
 * spreadsheet — CSV has no way to express nesting, and bundling several sheets
 * would mean shipping a zip writer for little gain.
 *
 * Always `no-store`: this body is the user's entire health history and must not
 * sit in a shared cache.
 */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";
  const now = new Date();
  const stem = exportFilenameStem(now);
  const noStore = { "Cache-Control": "no-store" };

  const data = await getUserExport(user.id, now);
  if (!data) {
    return NextResponse.json(
      { error: "Account not found" },
      { status: 404, headers: noStore },
    );
  }

  if (format === "json") {
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        ...noStore,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": contentDisposition(`${stem}.json`),
      },
    });
  }

  if (format === "csv") {
    const requested = url.searchParams.get("table");
    const tables = exportTables(data);
    const table = tables.find((t) => t.name === requested);
    if (!table) {
      return NextResponse.json(
        {
          error: "Unknown table",
          available: tables.map((t) => t.name),
        },
        { status: 400, headers: noStore },
      );
    }
    return new NextResponse(toCsv(table), {
      headers: {
        ...noStore,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": contentDisposition(`${stem}-${table.name}.csv`),
      },
    });
  }

  return NextResponse.json(
    { error: "Unsupported format", available: ["json", "csv"] },
    { status: 400, headers: noStore },
  );
}
