/**
 * Serialisation for the personal-data export (Tier 3).
 *
 * Deliberately unit-agnostic: the export carries canonical values (g, ml, cm,
 * mg/dL, metres, kcal) with the unit named in the column header, so a file
 * opened years later in a spreadsheet still means something. The user's display
 * preference is exported as metadata rather than applied to the numbers.
 */

export type ExportValue = string | number | boolean | null | undefined;

export type ExportTable = {
  /** File-safe name, also the CSV filename stem. */
  name: string;
  columns: string[];
  rows: ExportValue[][];
};

/**
 * RFC 4180 field escaping. Quotes when the value contains a delimiter, quote,
 * or newline, and doubles embedded quotes.
 *
 * A leading `=`, `+`, `-` or `@` is prefixed with a tab so spreadsheets treat it
 * as text — a note like `=cmd()` must not become a formula on open.
 */
export function csvField(value: ExportValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";

  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `\t${text}`;
  if (/["\n\r,]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function toCsv(table: ExportTable): string {
  const lines = [table.columns.map(csvField).join(",")];
  for (const row of table.rows) {
    lines.push(row.map(csvField).join(","));
  }
  // Trailing newline so `cat` and spreadsheet importers agree on the row count.
  return `${lines.join("\r\n")}\r\n`;
}

/** ISO 8601 in UTC, or empty for a missing date. */
export function isoOrEmpty(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/**
 * A filename stem that is safe on Windows, macOS and Linux and readable in a
 * downloads folder: `fitme-export-2026-07-29`.
 */
export function exportFilenameStem(at: Date): string {
  const day = isoOrEmpty(at).slice(0, 10) || "export";
  return `fitme-export-${day}`;
}

export function contentDisposition(filename: string): string {
  return `attachment; filename="${filename}"`;
}
