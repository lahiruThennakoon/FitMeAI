import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  ParseLoading,
  PARSE_LOADING_TIPS,
} from "@/app/(app)/log/parse-loading";

describe("ParseLoading", () => {
  it("shows progress status and a helpful tip when active", () => {
    const html = renderToStaticMarkup(
      createElement(ParseLoading, { active: true }),
    );
    expect(html).toContain('data-testid="parse-loading"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Matching foods and estimating nutrition…");
    expect(html).toContain(PARSE_LOADING_TIPS[0]);
    expect(html).toContain("Reading your description");
  });

  it("renders nothing when inactive", () => {
    const html = renderToStaticMarkup(
      createElement(ParseLoading, { active: false }),
    );
    expect(html).toBe("");
  });
});
