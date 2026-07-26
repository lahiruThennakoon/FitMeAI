import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { DeviationMark, deviationKind } from "@/app/(app)/dashboard/deviation-mark";

describe("deviationKind", () => {
  it("maps over / under / even", () => {
    expect(deviationKind(1200, 1000)).toBe("up");
    expect(deviationKind(800, 1000)).toBe("down");
    expect(deviationKind(1005, 1000, 10)).toBe("even");
  });
});

describe("DeviationMark", () => {
  it("renders arrow symbols with accessible labels", () => {
    const up = renderToStaticMarkup(
      createElement(DeviationMark, {
        kind: "up",
        label: "over target",
      }),
    );
    const down = renderToStaticMarkup(
      createElement(DeviationMark, {
        kind: "down",
        label: "under target",
      }),
    );
    expect(up).toContain("↑");
    expect(up).toContain('data-deviation="up"');
    expect(up).toContain("over target");
    expect(down).toContain("↓");
    expect(down).toContain('data-deviation="down"');

    const alert = renderToStaticMarkup(
      createElement(DeviationMark, {
        kind: "up",
        label: "over daily aim",
        alert: true,
      }),
    );
    expect(alert).toContain("↑");
    expect(alert).toContain('data-deviation="alert-over"');
    expect(alert).toContain("text-red-");
  });
});
