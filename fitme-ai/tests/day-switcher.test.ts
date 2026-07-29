import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  buildHomeDayLabels,
  nextZonedDayKey,
  previousZonedDayKey,
  resolveHomeDaySelection,
} from "@/lib/domain/dashboard/day-bounds";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const { DaySwitcher } = await import("@/app/(app)/dashboard/day-switcher");

const todayKey = "2026-07-27";
const yesterdayKey = "2026-07-26";

function renderSwitcher(
  overrides: Partial<{
    todayKey: string;
    yesterdayKey: string;
    selectedKey: string;
    switcherLabel: string;
    isToday: boolean;
    previousKey: string;
    nextKey: string | null;
  }> = {},
) {
  return renderToStaticMarkup(
    createElement(DaySwitcher, {
      todayKey,
      yesterdayKey,
      selectedKey: todayKey,
      switcherLabel: `Today · ${todayKey}`,
      isToday: true,
      previousKey: yesterdayKey,
      nextKey: null,
      ...overrides,
    }),
  );
}

function extractHref(html: string, testId: string): string | null {
  const re = new RegExp(
    `data-testid="${testId}"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*data-testid="${testId}"`,
  );
  const match = html.match(re);
  return match?.[1] ?? match?.[2] ?? null;
}

describe("DaySwitcher", () => {
  it("uses a fixed-column date-navigation grid shell", () => {
    const html = renderSwitcher();
    expect(html).toContain('data-testid="day-switcher"');
    expect(html).toContain("date-navigation");
    expect(html).toContain("date-label");
    expect(html).toContain('data-testid="day-switcher-prev"');
    expect(html).toContain('data-testid="day-switcher-calendar"');
    expect(html).toContain('data-testid="day-switcher-next-disabled"');
    expect(html).toContain('data-testid="day-switcher-shortcut"');
  });

  it("links Previous to exactly one calendar day earlier", () => {
    const html = renderSwitcher({
      selectedKey: "2026-07-25",
      isToday: false,
      nextKey: "2026-07-26",
      previousKey: "2026-07-24",
    });
    expect(extractHref(html, "day-switcher-prev")).toBe("/dashboard?day=2026-07-24");
    expect(html).toContain('aria-label="Previous day"');
    expect(previousZonedDayKey("2026-07-25", "UTC")).toBe("2026-07-24");
  });

  it("Previous href subtracts one day per selected date (repeated navigation)", () => {
    const keys = ["2026-07-27", "2026-07-26", "2026-07-25", "2026-07-24"];
    for (const key of keys) {
      const prevKey = previousZonedDayKey(key, "UTC");
      const html = renderSwitcher({
        selectedKey: key,
        switcherLabel: key,
        isToday: key === todayKey,
        previousKey: prevKey,
        nextKey: key === todayKey ? null : nextZonedDayKey(key, "UTC"),
      });
      expect(extractHref(html, "day-switcher-prev")).toBe(
        `/dashboard?day=${prevKey}`,
      );
    }
  });

  it("disables Next on Today while preserving its slot", () => {
    const html = renderSwitcher();
    expect(html).toContain('data-testid="day-switcher-next-disabled"');
    expect(html).not.toContain('data-testid="day-switcher-next"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('aria-label="Next day"');
    expect(html).toContain("date-nav-btn--disabled");
  });

  it("shows an enabled Next link when not on today", () => {
    const html = renderSwitcher({
      selectedKey: yesterdayKey,
      switcherLabel: `Yesterday · ${yesterdayKey}`,
      isToday: false,
      previousKey: "2026-07-25",
      nextKey: todayKey,
    });
    expect(extractHref(html, "day-switcher-next")).toBe("/dashboard");
    expect(html).toContain('data-testid="day-switcher-next"');
  });

  it("shows Yesterday shortcut on today and Today shortcut when viewing past days", () => {
    const todayHtml = renderSwitcher();
    expect(todayHtml).toContain(">Yesterday</a>");
    expect(extractHref(todayHtml, "day-switcher-shortcut")).toBe(
      `/dashboard?day=${yesterdayKey}`,
    );

    const pastHtml = renderSwitcher({
      selectedKey: yesterdayKey,
      switcherLabel: `Yesterday · ${yesterdayKey}`,
      isToday: false,
      previousKey: "2026-07-25",
      nextKey: todayKey,
    });
    expect(pastHtml).toContain(">Today</a>");
    expect(extractHref(pastHtml, "day-switcher-shortcut")).toBe("/dashboard");
  });

  it("uses the same fixed-width control classes for Today and Yesterday states", () => {
    const todayHtml = renderSwitcher();
    const pastHtml = renderSwitcher({
      selectedKey: yesterdayKey,
      isToday: false,
      previousKey: "2026-07-25",
      nextKey: todayKey,
    });

    for (const html of [todayHtml, pastHtml]) {
      expect(html).toContain("date-nav-btn date-nav-btn--ghost");
      expect(html).toContain("date-nav-btn date-nav-calendar");
      expect(html).toContain("date-nav-shortcut");
    }
    expect(todayHtml).toContain("date-nav-shortcut--link");
    expect(pastHtml).toContain("date-nav-shortcut--today");
  });

  it("calendar button has a meaningful aria-label", () => {
    const html = renderSwitcher();
    expect(html).toContain(`aria-label="Open calendar, currently ${todayKey}"`);
  });

  it("dashboard sections share one resolved selected date from URL", () => {
    const now = new Date("2026-07-27T12:00:00.000Z");
    const sel = resolveHomeDaySelection({
      now,
      timeZone: "UTC",
      requestedDay: "2026-07-25",
    });
    expect(sel.bounds.dayKey).toBe("2026-07-25");
    expect(sel.labels.dayKey).toBe("2026-07-25");
    expect(sel.labels.summaryPrefix).not.toBe("Today");
    expect(buildHomeDayLabels("2026-07-25", sel.todayKey, sel.yesterdayKey).dayKey).toBe(
      "2026-07-25",
    );
  });
});

describe("dashboard helper text stability", () => {
  it("reserves min-height for header blurb and supportive message classes", () => {
    const labels = buildHomeDayLabels(todayKey, todayKey, yesterdayKey);
    expect(labels.headerBlurb.length).toBeGreaterThan(10);
    const pastLabels = buildHomeDayLabels("2026-07-20", todayKey, yesterdayKey);
    expect(pastLabels.headerBlurb.length).toBeGreaterThan(labels.headerBlurb.length - 20);
  });
});
