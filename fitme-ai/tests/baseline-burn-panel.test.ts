import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { BaselineBurnPanel } from "@/app/(app)/dashboard/baseline-burn-panel";
import { computeBaselineBurn } from "@/lib/domain/burn/baseline";

describe("BaselineBurnPanel", () => {
  it("shows baseline, net, and formula transparency", () => {
    const burn = computeBaselineBurn({
      weightG: 70_000,
      heightCm: 175,
      ageYears: 30,
      sex: "male",
      activityLevel: "moderately_active",
    });
    const html = renderToStaticMarkup(
      createElement(BaselineBurnPanel, {
        burn,
        intakeKcal: 1800,
        exerciseKcal: 0,
        netKcal: 1800 - burn.baselineBurnKcal,
      }),
    );
    expect(html).toContain("Baseline Burn");
    expect(html).toContain("Net calories");
    expect(html).toContain("How Baseline Burn is calculated");
    expect(html).toContain("Mifflin");
    expect(html).toContain("not medical advice");
    expect(html).toContain("Exercise:");
    expect(html).toContain("0 kcal (none logged)");
  });
});

