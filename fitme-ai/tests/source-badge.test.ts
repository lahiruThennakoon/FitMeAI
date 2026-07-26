import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { SourceBadge } from "@/app/(app)/log/source-badge";

describe("SourceBadge", () => {
  it("renders Database without confidence percent", () => {
    const html = renderToStaticMarkup(
      createElement(SourceBadge, {
        dataSource: "database",
        confidence: 0.9,
      }),
    );
    expect(html).toContain("Database");
    expect(html).toContain('aria-label="Source: nutrition database"');
    expect(html).not.toContain("90%");
  });

  it("renders Estimated with confidence", () => {
    const html = renderToStaticMarkup(
      createElement(SourceBadge, {
        dataSource: "ai_estimated",
        confidence: 0.64,
      }),
    );
    expect(html).toContain("Estimated");
    expect(html).toContain("64%");
    expect(html).toContain(
      'aria-label="Source: AI estimate · confidence 64%"',
    );
  });
});
