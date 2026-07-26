import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { BaselineBurnCalcDetails } from "@/components/formula-disclosure";
import { computeBaselineBurn } from "@/lib/domain/burn/baseline";

describe("BaselineBurnCalcDetails", () => {
  it("renders compact labeled BMR and TDEE rows", () => {
    const burn = computeBaselineBurn({
      weightG: 70_000,
      heightCm: 175,
      ageYears: 30,
      sex: "male",
      activityLevel: "sedentary",
    });
    const html = renderToStaticMarkup(
      createElement(BaselineBurnCalcDetails, { burn }),
    );
    expect(html).toContain("How Baseline Burn is calculated");
    expect(html).toContain("BMR");
    expect(html).toContain("Baseline Burn");
    expect(html).toContain("Mifflin");
    expect(html).toContain("not medical advice");
    expect(html).toContain("text-[11px]");
    expect(html).toContain("text-[10px]");
  });
});
