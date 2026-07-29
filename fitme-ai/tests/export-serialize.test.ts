import { describe, it, expect } from "vitest";
import {
  contentDisposition,
  csvField,
  exportFilenameStem,
  isoOrEmpty,
  toCsv,
  type ExportTable,
} from "@/lib/domain/export/serialize";

describe("csvField", () => {
  it("passes plain values through", () => {
    expect(csvField("porridge")).toBe("porridge");
    expect(csvField(420)).toBe("420");
    expect(csvField(true)).toBe("true");
  });

  it("renders missing values as an empty cell, not the word null", () => {
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
    expect(csvField(Number.NaN)).toBe("");
    expect(csvField(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("quotes fields containing a comma, quote, or newline", () => {
    expect(csvField("rice, dhal")).toBe('"rice, dhal"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("line one\nline two")).toBe('"line one\nline two"');
  });

  it("neutralises values a spreadsheet would run as a formula", () => {
    // A note starting with = must open as text, not execute.
    expect(csvField("=1+1")).toBe("\t=1+1");
    expect(csvField("+44 77")).toBe("\t+44 77");
    expect(csvField("-5 kg")).toBe("\t-5 kg");
    expect(csvField("@handle")).toBe("\t@handle");
  });

  it("still quotes a formula-shaped value that also needs quoting", () => {
    const out = csvField("=SUM(A1,A2)");
    expect(out.startsWith('"\t=')).toBe(true);
    expect(out.endsWith('"')).toBe(true);
  });

  it("leaves negative numbers alone — only strings are formula risks", () => {
    expect(csvField(-5)).toBe("-5");
  });
});

describe("toCsv", () => {
  const table: ExportTable = {
    name: "weight",
    columns: ["recordedAt", "weightG", "note"],
    rows: [
      ["2026-07-01T06:00:00.000Z", 72_400, null],
      ["2026-07-08T06:00:00.000Z", 71_900, "after a walk, felt good"],
    ],
  };

  it("writes a header row then one row per record", () => {
    const csv = toCsv(table);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("recordedAt,weightG,note");
    expect(lines[2]).toContain('"after a walk, felt good"');
  });

  it("ends with a newline so importers agree on the row count", () => {
    expect(toCsv(table).endsWith("\r\n")).toBe(true);
  });

  it("emits only a header when there are no rows", () => {
    const csv = toCsv({ ...table, rows: [] });
    expect(csv).toBe("recordedAt,weightG,note\r\n");
  });
});

describe("filenames", () => {
  it("dates the file so repeated exports don't overwrite each other", () => {
    expect(exportFilenameStem(new Date("2026-07-29T10:30:00Z"))).toBe(
      "fitme-export-2026-07-29",
    );
  });

  it("falls back rather than producing a broken name for an invalid date", () => {
    expect(exportFilenameStem(new Date("nonsense"))).toBe(
      "fitme-export-export",
    );
  });

  it("marks the response as an attachment", () => {
    expect(contentDisposition("a.json")).toBe(
      'attachment; filename="a.json"',
    );
  });
});

describe("isoOrEmpty", () => {
  it("normalises dates and strings to UTC ISO", () => {
    expect(isoOrEmpty(new Date("2026-07-29T10:00:00Z"))).toBe(
      "2026-07-29T10:00:00.000Z",
    );
    expect(isoOrEmpty("2026-07-29T10:00:00Z")).toBe(
      "2026-07-29T10:00:00.000Z",
    );
  });

  it("returns an empty cell for null, undefined, and invalid dates", () => {
    expect(isoOrEmpty(null)).toBe("");
    expect(isoOrEmpty(undefined)).toBe("");
    expect(isoOrEmpty(new Date("nope"))).toBe("");
  });
});
