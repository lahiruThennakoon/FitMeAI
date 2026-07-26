import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { EnergyBalanceChart } from "@/app/(app)/dashboard/energy-balance-chart";
import { describeEnergyBalance } from "@/lib/domain/dashboard/daily-summary";

describe("EnergyBalanceChart", () => {
  it("renders ring hero and food / burn rows", () => {
    const balance = describeEnergyBalance(1438 - 2338);
    const html = renderToStaticMarkup(
      createElement(EnergyBalanceChart, {
        intakeKcal: 1438,
        baselineBurnKcal: 2185,
        exerciseKcal: 153,
        balance,
      }),
    );
    expect(html).toContain('data-testid="energy-balance-chart"');
    expect(html).toContain("Food");
    expect(html).toContain("Burn");
    expect(html).toContain("🔥");
    expect(html).toContain("1438 kcal");
    expect(html).toContain("2338 kcal");
    expect(html).toContain("Includes 153 exercise");
    expect(html).toContain("You still have");
    expect(html).toContain("kcal left");
    expect(html).toContain("circle");
  });

  it("shows over state with alert mark when food exceeds burn", () => {
    const balance = describeEnergyBalance(800);
    const html = renderToStaticMarkup(
      createElement(EnergyBalanceChart, {
        intakeKcal: 2800,
        baselineBurnKcal: 2000,
        exerciseKcal: 0,
        balance,
      }),
    );
    expect(html).toContain("bg-red-500");
    expect(html).toContain("kcal over");
    expect(html).toContain('data-deviation="alert-over"');
  });
});
