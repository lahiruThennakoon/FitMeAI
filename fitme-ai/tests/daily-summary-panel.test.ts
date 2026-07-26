import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { DailySummaryPanel } from "@/app/(app)/dashboard/daily-summary-panel";
import { buildDailySummary } from "@/lib/domain/dashboard/daily-summary";
import type { GoalDto, ProfileDto } from "@/lib/domain/targets/types";

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
      profile,
      goal,
    });
    const html = renderToStaticMarkup(
      createElement(DailySummaryPanel, { summary }),
    );
    expect(html).toContain('data-testid="daily-summary"');
    expect(html).toContain("Consumed");
    expect(html).toContain("Remaining");
    expect(html).toContain("Net calories");
    expect(html).toContain("Protein");
    expect(html).toContain("Water");
    expect(html).toContain("progressbar");
  });
});
