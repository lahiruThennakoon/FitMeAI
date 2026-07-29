import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { buildDailySummary } from "@/lib/domain/dashboard/daily-summary";
import { buildHomeDayLabels } from "@/lib/domain/dashboard/day-bounds";
import type { GoalDto, ProfileDto } from "@/lib/domain/targets/types";

// WaterLogControl is a client component that calls next/navigation's
// useRouter(), which requires an App Router context unavailable under plain
// renderToStaticMarkup. Its own behavior is covered by
// save-water-action.test.ts; here we only assert the panel's static markup.
vi.mock("@/app/(app)/dashboard/water-log-control", () => ({
  WaterLogControl: () => null,
}));

const { DailySummaryPanel } = await import(
  "@/app/(app)/dashboard/daily-summary-panel"
);

const profile: ProfileDto = {
  displayName: "Alex",
  ageYears: 30,
  sex: "male",
  heightCm: 175,
  currentWeightG: 70_000,
  targetWeightG: 70_000,
  activityLevel: "moderately_active",
  dietaryPreferences: [],
  goalType: "maintenance",
  preferredUnits: "metric",
  preferredGlucoseUnit: "mg_dl",
  eatBackExercise: false,
  notifyFastingEnd: false,
  notifyWeeklyDigest: false,
  country: "LK",
  timezone: "Asia/Colombo",
};

const goal: GoalDto = {
  bmrKcal: 1649,
  tdeeKcal: 2556,
  caloriesKcal: 2556,
  proteinG: 140,
  carbsG: 280,
  fatG: 70,
  fibreG: 30,
  waterMl: 2450,
  steps: 8000,
  exerciseMinutes: 30,
  weeklyWeightChangeG: 0,
  overriddenFields: [],
  safetyLevel: "green",
  safetyReasons: [],
  safetyConsentGiven: false,
  safetyConsentAt: null,
};

function panelLabels(dayKey = "2026-07-26") {
  return buildHomeDayLabels(dayKey, dayKey, "2026-07-25");
}

describe("DailySummaryPanel", () => {
  it("renders calories, macros, water, and net", () => {
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [
        {
          energyKcal: 900,
          proteinG: 40,
          carbsG: 90,
          fatG: 25,
          fibreG: 10,
          sugarG: 12,
          sodiumMg: 400,
        },
      ],
      exerciseKcal: 150,
      waterMlConsumed: 1000,
      profile,
      goal,
    });
    const html = renderToStaticMarkup(
      createElement(DailySummaryPanel, { summary, labels: panelLabels(), waterEntries: [], waterLogAtIso: null }),
    );
    expect(html).toContain('data-testid="daily-summary"');
    expect(html).toContain("Consumed");
    expect(html).toContain("Remaining");
    expect(html).toContain("Today");
    expect(html).toContain("Below burn");
    expect(html).toContain("below burn");
    expect(html).not.toMatch(/You still have \d+ kcal to eat/i);
    expect(html).toContain('data-testid="energy-balance-chart"');
    expect(html).toContain("Food");
    expect(html).toContain("Burn");
    expect(html).toContain("Share of burn eaten");
    // The arithmetic behind Baseline Burn is visible, not only in the disclosure.
    expect(html).toContain('data-testid="baseline-burn-gist"');
    expect(html).toMatch(/= BMR [\s\S]*Mifflin/);
    expect(html).toContain("Show the full formula");
    expect(html).toContain("of ");
    expect(html).toContain("Protein");
    expect(html).toContain("Water");
    expect(html).toContain('data-testid="summary-supportive-message"');
    expect(html).toContain("dashboard-helper-text");
    expect(html).toContain("1000");
    expect(html).toContain("of 2450 ml");
    expect(html).toContain("progressbar");
    expect(html).toMatch(/bg-brand-teal|bg-brand-green|bg-sky-500/);
  });

  it("bridges Remaining and the energy panel when exercise isn't credited", () => {
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [],
      exerciseKcal: 180,
      profile,
      goal,
    });
    const html = renderToStaticMarkup(
      createElement(DailySummaryPanel, {
        summary,
        labels: panelLabels(),
        waterEntries: [],
        waterLogAtIso: null,
      }),
    );
    expect(html).toContain('data-testid="remaining-basis"');
    expect(html).toContain("180 kcal of exercise");
    // Budget equals the target here, so there's no second number to explain.
    expect(html).not.toContain("kcal budget");
  });

  it("spells out the budget when exercise is eaten back", () => {
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [],
      exerciseKcal: 180,
      profile: { ...profile, eatBackExercise: true },
      goal,
    });
    const html = renderToStaticMarkup(
      createElement(DailySummaryPanel, {
        summary,
        labels: panelLabels(),
        waterEntries: [],
        waterLogAtIso: null,
      }),
    );
    expect(html).toContain(`of ${goal.caloriesKcal + 180} kcal budget`);
  });

  it("shows movement aims with logged minutes and an honest steps note", () => {
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [],
      exerciseKcal: 200,
      exerciseMinutes: 20,
      profile,
      goal,
    });
    const html = renderToStaticMarkup(
      createElement(DailySummaryPanel, {
        summary,
        labels: panelLabels(),
        waterEntries: [],
        waterLogAtIso: null,
      }),
    );
    expect(html).toContain('data-testid="movement-aims"');
    expect(html).toContain("of 30 min");
    expect(html).toContain("Step aim");
    expect(html).toMatch(/doesn.{0,8}t record steps yet/);
  });

  it("hides movement aims when there is no goal", () => {
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [],
      exerciseKcal: 0,
      profile,
      goal: null,
    });
    const html = renderToStaticMarkup(
      createElement(DailySummaryPanel, {
        summary,
        labels: panelLabels(),
        waterEntries: [],
        waterLogAtIso: null,
      }),
    );
    expect(html).not.toContain('data-testid="movement-aims"');
  });

  it("shows a green ↑ (not red alert) when water goes past the daily aim", () => {
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [],
      exerciseKcal: 0,
      waterMlConsumed: 3000,
      profile,
      goal,
    });
    const html = renderToStaticMarkup(
      createElement(DailySummaryPanel, { summary, labels: panelLabels(), waterEntries: [], waterLogAtIso: null }),
    );
    // Extra water is fine — celebrate with green, never red shame.
    expect(html).toContain("Past daily water aim");
    expect(html).toContain("text-brand-green");
    expect(html).toContain("bg-brand-green");
    expect(html).not.toContain('data-deviation="alert-over"');
  });

  it("scales the over-target slice so a small overage differs from a large one", () => {
    function overWidths(fatG: number) {
      const summary = buildDailySummary({
        dayKey: "2026-07-26",
        entries: [
          {
            energyKcal: 0,
            proteinG: 0,
            carbsG: 0,
            fatG,
            fibreG: 0,
            sugarG: 0,
            sodiumMg: 0,
          },
        ],
        exerciseKcal: 0,
        waterMlConsumed: 0,
        profile,
        goal,
      });
      const html = renderToStaticMarkup(
        createElement(DailySummaryPanel, { summary, labels: panelLabels(), waterEntries: [], waterLogAtIso: null }),
      );
      return html;
    }

    // Fat aim is 70 g. Just over vs. far over must not render identically.
    const slightlyOver = overWidths(74);
    const farOver = overWidths(140);

    // The macro keeps its own colour; only the excess slice is red.
    expect(slightlyOver).toContain("bg-amber-500");
    expect(slightlyOver).toContain("bg-red-500/90");

    const widthOf = (html: string) =>
      [...html.matchAll(/bg-red-500\/90[^"]*"\s+style="width:([\d.]+)%/g)].map(
        (m) => Number(m[1]),
      );

    const smallSlice = widthOf(slightlyOver);
    const bigSlice = widthOf(farOver);
    expect(smallSlice.length).toBeGreaterThan(0);
    expect(bigSlice.length).toBeGreaterThan(0);
    expect(bigSlice[0]).toBeGreaterThan(smallSlice[0]);
    // 74 of 70 → ~5% excess; 140 of 70 → 50% excess.
    expect(smallSlice[0]).toBeLessThan(10);
    expect(bigSlice[0]).toBeCloseTo(50, 0);
  });

  it("keeps the real percentage available to assistive tech when over the aim", () => {
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [
        {
          energyKcal: 0,
          proteinG: 0,
          carbsG: 0,
          fatG: 140,
          fibreG: 0,
          sugarG: 0,
          sodiumMg: 0,
        },
      ],
      exerciseKcal: 0,
      waterMlConsumed: 0,
      profile,
      goal,
    });
    const html = renderToStaticMarkup(
      createElement(DailySummaryPanel, { summary, labels: panelLabels(), waterEntries: [], waterLogAtIso: null }),
    );
    // aria-valuenow saturates at 100; valuetext must still carry the overage.
    expect(html).toContain("200% of aim, 70 g over");
  });

  it("labels the water target as a default when there is no goal", () => {
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [],
      exerciseKcal: 0,
      waterMlConsumed: 500,
      profile,
      goal: null,
    });
    const html = renderToStaticMarkup(
      createElement(DailySummaryPanel, { summary, labels: panelLabels(), waterEntries: [], waterLogAtIso: null }),
    );
    expect(html).toContain("of 2000 ml");
    expect(html).toContain("Using a default aim of 2000 ml");
  });

  it("displays water in fl oz for imperial preference, storing canonical ml (AC7)", () => {
    const imperialProfile: ProfileDto = { ...profile, preferredUnits: "imperial" };
    const summary = buildDailySummary({
      dayKey: "2026-07-26",
      entries: [],
      exerciseKcal: 0,
      waterMlConsumed: 500,
      profile: imperialProfile,
      goal,
    });
    const html = renderToStaticMarkup(
      createElement(DailySummaryPanel, { summary, labels: panelLabels(), waterEntries: [], waterLogAtIso: null }),
    );
    // 500 ml ≈ 17 fl oz, 2450 ml target ≈ 83 fl oz (displayWater rounds to whole units).
    expect(html).toContain("fl oz");
    expect(html).not.toContain("of 2450 ml");
    expect(summary.waterMlTarget).toBe(2450);
  });
});
