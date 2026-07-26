import { describe, it, expect } from "vitest";
import {
  formatConfidencePercent,
  isEstimatedSource,
  sourceBadgeClassName,
  sourceCardClassName,
  sourceCitationText,
  sourceLabel,
} from "@/lib/domain/nutrition/source-citation";

describe("source citation (FR-10)", () => {
  it("labels database vs estimated", () => {
    expect(sourceLabel("database")).toBe("Database");
    expect(sourceLabel("ai_estimated")).toBe("Estimated");
    expect(isEstimatedSource("ai_estimated")).toBe(true);
    expect(isEstimatedSource("database")).toBe(false);
  });

  it("formats confidence percent", () => {
    expect(formatConfidencePercent(0.85)).toBe("85%");
    expect(formatConfidencePercent(1.2)).toBe("100%");
    expect(formatConfidencePercent(-0.1)).toBe("0%");
  });

  it("builds accessible citation copy with confidence for estimates", () => {
    expect(sourceCitationText("database")).toBe(
      "Source: nutrition database",
    );
    expect(sourceCitationText("ai_estimated", 0.72)).toBe(
      "Source: AI estimate · confidence 72%",
    );
  });

  it("uses distinct badge and card classes for estimated vs database", () => {
    expect(sourceBadgeClassName("database")).toMatch(/emerald/);
    expect(sourceBadgeClassName("ai_estimated")).toMatch(/amber/);
    expect(sourceCardClassName("ai_estimated")).toMatch(/amber/);
    expect(sourceCardClassName("database")).not.toMatch(/amber/);
  });

  it("keeps AA-oriented contrast tokens (dark text on light amber/emerald)", () => {
    // Light mode: dark text on tinted backgrounds (not pale-on-pale).
    expect(sourceBadgeClassName("ai_estimated")).toMatch(/text-amber-950/);
    expect(sourceBadgeClassName("database")).toMatch(/text-emerald-900/);
  });
});
