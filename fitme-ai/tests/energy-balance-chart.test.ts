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
    expect(html).toContain("Share of burn eaten");
    expect(html).toContain("Includes 153 exercise");
    expect(html).toContain("below burn");
    expect(html).not.toMatch(/You still have \d+ kcal to eat/i);
    expect(html).toContain("circle");
    expect(html).toContain('data-testid="energy-burn-bar"');
    expect(html).toContain('style="width:100%"');
  });

  it("shows empty food bar and full burn reference when intake is zero", () => {
    const balance = describeEnergyBalance(-2185);
    const html = renderToStaticMarkup(
      createElement(EnergyBalanceChart, {
        intakeKcal: 0,
        baselineBurnKcal: 2185,
        exerciseKcal: 0,
        balance,
      }),
    );
    expect(html).toContain('data-testid="energy-food-bar"');
    expect(html).toContain('style="width:0%"');
    expect(html).toContain('data-testid="energy-burn-bar"');
    expect(html).toContain('style="width:100%"');
    expect(html).toContain("2185 kcal");
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

  it("shows over (not even) when food slightly exceeds displayed burn totals", () => {
    const balance = describeEnergyBalance(34, {
      intakeKcal: 2785,
      burnKcal: 2751,
    });
    const html = renderToStaticMarkup(
      createElement(EnergyBalanceChart, {
        intakeKcal: 2785,
        baselineBurnKcal: 2571,
        exerciseKcal: 180,
        balance,
      }),
    );
    expect(balance.kind).toBe("over");
    expect(html).toContain("34");
    expect(html).toContain("kcal over burn");
    expect(html).not.toContain("Food matches burn");
  });
});
