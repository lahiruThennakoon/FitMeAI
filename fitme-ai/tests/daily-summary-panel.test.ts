import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { buildDailySummary } from "@/lib/domain/dashboard/daily-summary";
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
      createElement(DailySummaryPanel, { summary }),
    );
    expect(html).toContain('data-testid="daily-summary"');
    expect(html).toContain("Consumed");
    expect(html).toContain("Remaining");
    expect(html).toContain("Today");
    expect(html).toContain("Room left");
    expect(html).toContain("You still have");
    expect(html).toContain('data-testid="energy-balance-chart"');
    expect(html).toContain("Food");
    expect(html).toContain("Burn");
    expect(html).toContain("Calories eaten");
    expect(html).toContain("How Baseline Burn is calculated");
    expect(html).toContain("of ");
    expect(html).toContain("Protein");
    expect(html).toContain("Water");
    expect(html).toContain('data-testid="water-card"');
    expect(html).toContain("1000");
    expect(html).toContain("of 2450 ml");
    expect(html).toContain("progressbar");
    expect(html).toMatch(/bg-brand-teal|bg-brand-green|bg-sky-500/);
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
      createElement(DailySummaryPanel, { summary }),
    );
    // Extra water is fine — celebrate with green, never red shame.
    expect(html).toContain("Past daily water aim");
    expect(html).toContain("text-brand-green");
    expect(html).toContain("bg-brand-green");
    expect(html).not.toContain('data-deviation="alert-over"');
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
      createElement(DailySummaryPanel, { summary }),
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
      createElement(DailySummaryPanel, { summary }),
    );
    // 500 ml ≈ 17 fl oz, 2450 ml target ≈ 83 fl oz (displayWater rounds to whole units).
    expect(html).toContain("fl oz");
    expect(html).not.toContain("of 2450 ml");
    expect(summary.waterMlTarget).toBe(2450);
  });
});
