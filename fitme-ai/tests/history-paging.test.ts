import { describe, it, expect } from "vitest";
import {
  HISTORY_MAX_LIMIT,
  HISTORY_PAGE_SIZE,
  fetchLimit,
  parseHistoryLimit,
  sliceHistoryPage,
} from "@/lib/domain/history/paging";

describe("parseHistoryLimit", () => {
  it("defaults to one page", () => {
    expect(parseHistoryLimit(undefined)).toBe(HISTORY_PAGE_SIZE);
    expect(parseHistoryLimit("")).toBe(HISTORY_PAGE_SIZE);
  });

  it("keeps whole pages so the steps stay predictable", () => {
    expect(parseHistoryLimit("40")).toBe(40);
    expect(parseHistoryLimit("41")).toBe(60);
  });

  it("ignores junk and negatives instead of erroring", () => {
    expect(parseHistoryLimit("banana")).toBe(HISTORY_PAGE_SIZE);
    expect(parseHistoryLimit("-100")).toBe(HISTORY_PAGE_SIZE);
    expect(parseHistoryLimit("0")).toBe(HISTORY_PAGE_SIZE);
  });

  it("caps a crafted request so nobody can ask for the whole table", () => {
    expect(parseHistoryLimit("999999")).toBe(HISTORY_MAX_LIMIT);
    expect(parseHistoryLimit("Infinity")).toBe(HISTORY_PAGE_SIZE);
  });
});

describe("sliceHistoryPage", () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => i);

  it("asks for one extra row so has-more needs no count query", () => {
    expect(fetchLimit(20)).toBe(21);
  });

  it("reports another page when the probe row came back", () => {
    const page = sliceHistoryPage(rows(21), 20);
    expect(page.items).toHaveLength(20);
    expect(page.hasMore).toBe(true);
    expect(page.nextLimit).toBe(40);
  });

  it("does not show the probe row to the user", () => {
    const page = sliceHistoryPage(rows(21), 20);
    expect(page.items).not.toContain(20);
  });

  it("reports no more when the page came back exactly full", () => {
    expect(sliceHistoryPage(rows(20), 20).hasMore).toBe(false);
  });

  it("reports no more for a short page", () => {
    const page = sliceHistoryPage(rows(5), 20);
    expect(page.items).toHaveLength(5);
    expect(page.hasMore).toBe(false);
  });

  it("handles an empty list", () => {
    const page = sliceHistoryPage(rows(0), 20);
    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(false);
  });

  it("stops offering more at the ceiling, so the link can't loop forever", () => {
    const page = sliceHistoryPage(rows(HISTORY_MAX_LIMIT + 1), HISTORY_MAX_LIMIT);
    expect(page.hasMore).toBe(false);
    expect(page.nextLimit).toBe(HISTORY_MAX_LIMIT);
  });
});
