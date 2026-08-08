import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  FIRST_VISIT_HEADER_BLURB,
  buildHomeDayLabels,
  isDashboardFirstVisitMode,
  isDashboardOnboardingMode,
  resolveDashboardHeaderBlurb,
} from "@/lib/domain/dashboard/day-bounds";

describe("dashboard first-visit helpers", () => {
  const todayKey = "2026-07-26";
  const yesterdayKey = "2026-07-25";

  it("detects first-visit mode only for today with zero meals", () => {
    expect(
      isDashboardFirstVisitMode({ isToday: true, mealCountToday: 0 }),
    ).toBe(true);
    expect(
      isDashboardFirstVisitMode({ isToday: true, mealCountToday: 1 }),
    ).toBe(false);
    expect(
      isDashboardFirstVisitMode({ isToday: false, mealCountToday: 0 }),
    ).toBe(false);
  });

  it("uses action-oriented header blurb on first visit today", () => {
    const labels = buildHomeDayLabels(todayKey, todayKey, yesterdayKey);
    expect(
      resolveDashboardHeaderBlurb(labels, { showFirstVisit: true }),
    ).toBe(FIRST_VISIT_HEADER_BLURB);
    expect(
      resolveDashboardHeaderBlurb(labels, { showFirstVisit: false }),
    ).toBe(labels.headerBlurb);
  });

  it("keeps default blurb for past days even when showFirstVisit is true", () => {
    const labels = buildHomeDayLabels("2026-07-20", todayKey, yesterdayKey);
    expect(
      resolveDashboardHeaderBlurb(labels, { showFirstVisit: true }),
    ).toBe(labels.headerBlurb);
  });

  it("detects onboarding mode only for today when user never logged food", () => {
    expect(
      isDashboardOnboardingMode({ isToday: true, hasEverLoggedMeal: false }),
    ).toBe(true);
    expect(
      isDashboardOnboardingMode({ isToday: true, hasEverLoggedMeal: true }),
    ).toBe(false);
    expect(
      isDashboardOnboardingMode({ isToday: false, hasEverLoggedMeal: false }),
    ).toBe(false);
  });
});

describe("onboarding browser storage", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem(key: string) {
        return store[key] ?? null;
      },
      setItem(key: string, value: string) {
        store[key] = value;
      },
    });
    vi.stubGlobal("window", globalThis);
  });

  it("tracks dismiss flags for first-visit guide and checklist", async () => {
    const {
      dismissFirstVisitGuide,
      dismissGettingStartedChecklist,
      isFirstVisitGuideDismissed,
      isGettingStartedChecklistDismissed,
    } = await import("@/lib/onboarding/browser");

    expect(isFirstVisitGuideDismissed()).toBe(false);
    expect(isGettingStartedChecklistDismissed()).toBe(false);

    dismissFirstVisitGuide();
    dismissGettingStartedChecklist();

    expect(isFirstVisitGuideDismissed()).toBe(true);
    expect(isGettingStartedChecklistDismissed()).toBe(true);
  });
});
