import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  buildTimeScale,
  filterTicksByPixelGap,
  formatTimeTick,
  formatValueTick,
  niceScale,
  niceScaleForMetric,
  pickLabelIndices,
} from "@/lib/domain/progress/chart-scale";
import { ProgressChart } from "@/app/(app)/progress/progress-chart";

describe("chart-scale", () => {
  it("returns padded nice ticks for a weight range", () => {
    const scale = niceScale(72.1, 74.8, 4);
    expect(scale.min).toBeLessThan(72.1);
    expect(scale.max).toBeGreaterThan(74.8);
    expect(scale.ticks.length).toBeGreaterThanOrEqual(3);
  });

  it("uses finer glucose ticks than coarse 50-step jumps", () => {
    const scale = niceScaleForMetric(98, 145, "glucose");
    const steps = scale.ticks.slice(1).map((t, i) => t - scale.ticks[i]!);
    const maxStep = Math.max(...steps);
    expect(maxStep).toBeLessThanOrEqual(20);
    expect(scale.ticks.length).toBeGreaterThanOrEqual(4);
  });

  it("builds evenly spaced time ticks capped for mobile width", () => {
    const min = new Date("2026-07-17T12:00:00Z").getTime();
    const max = new Date("2026-07-29T12:00:00Z").getTime();
    const scale = buildTimeScale(min, max, 292, 52);
    expect(scale.ticks.length).toBeLessThanOrEqual(4);
    expect(scale.ticks[0]).toBe(min);
    expect(scale.ticks.at(-1)).toBe(max);
  });

  it("filters ticks that would overlap on screen", () => {
    const ticks = [0, 10, 20, 21, 22, 100];
    const filtered = filterTicksByPixelGap(ticks, (v) => v, 15);
    expect(filtered).not.toContain(21);
    expect(filtered).not.toContain(22);
    expect(filtered[0]).toBe(0);
    expect(filtered).toContain(100);
  });

  it("keeps vertical-axis ticks when pixel Y decreases as values rise", () => {
    const ticks = [80, 100, 120, 140];
    const toPixel = (v: number) => 200 - v;
    const filtered = filterTicksByPixelGap(ticks, toPixel, 20);
    expect(filtered.length).toBeGreaterThanOrEqual(3);
    expect(filtered).toContain(80);
    expect(filtered).toContain(140);
  });

  it("handles flat series", () => {
    const scale = niceScale(70, 70, 4);
    expect(scale.max).toBeGreaterThan(scale.min);
  });

  it("formats value ticks", () => {
    expect(formatValueTick(72.34)).toBe("72.3");
    expect(formatValueTick(120, "glucose")).toBe("120");
  });

  it("formats time ticks", () => {
    const label = formatTimeTick(new Date("2026-07-20T12:00:00Z").getTime());
    expect(label).toMatch(/Jul/);
    expect(label).toMatch(/20/);
  });

  it("picks spread label indices", () => {
    expect(pickLabelIndices(7, 5)).toEqual([0, 2, 3, 5, 6]);
  });
});

describe("ProgressChart", () => {
  const weightPoints = [
    {
      x: new Date("2026-07-01T12:00:00Z").getTime(),
      y: 74.5,
      xLabel: "2026-07-01",
      yLabel: "74.5",
    },
    {
      x: new Date("2026-07-08T12:00:00Z").getTime(),
      y: 73.8,
      xLabel: "2026-07-08",
      yLabel: "73.8",
    },
    {
      x: new Date("2026-07-15T12:00:00Z").getTime(),
      y: 73.2,
      xLabel: "2026-07-15",
      yLabel: "73.2",
    },
    {
      x: new Date("2026-07-22T12:00:00Z").getTime(),
      y: 72.9,
      xLabel: "2026-07-22",
      yLabel: "72.9",
    },
  ];

  const glucosePoints = [
    { x: new Date("2026-07-17T08:00:00Z").getTime(), y: 95, xLabel: "2026-07-17", yLabel: "95" },
    { x: new Date("2026-07-20T08:00:00Z").getTime(), y: 110, xLabel: "2026-07-20", yLabel: "110" },
    { x: new Date("2026-07-22T08:00:00Z").getTime(), y: 128, xLabel: "2026-07-22", yLabel: "128" },
    { x: new Date("2026-07-24T08:00:00Z").getTime(), y: 118, xLabel: "2026-07-24", yLabel: "118" },
    { x: new Date("2026-07-28T08:00:00Z").getTime(), y: 142, xLabel: "2026-07-28", yLabel: "142" },
    { x: new Date("2026-07-29T08:00:00Z").getTime(), y: 136, xLabel: "2026-07-29", yLabel: "136" },
  ];

  it("renders axis ticks and grid for time × weight", () => {
    const html = renderToStaticMarkup(
      createElement(ProgressChart, {
        points: weightPoints,
        xMetric: "time",
        yMetric: "weight",
        xAxisLabel: "Date",
        yAxisLabel: "Weight (kg)",
      }),
    );
    expect(html).toContain('data-testid="progress-chart"');
    expect(html).toContain("stroke-dasharray");
    expect(html).toContain("<title>");
  });

  it("limits time × glucose to readable date labels (no overlap pile-up)", () => {
    const html = renderToStaticMarkup(
      createElement(ProgressChart, {
        points: glucosePoints,
        xMetric: "time",
        yMetric: "glucose",
        xAxisLabel: "Date",
        yAxisLabel: "Glucose (mg/dL)",
      }),
    );
    const julLabels = (html.match(/Jul \d+/g) ?? []).length;
    expect(julLabels).toBeLessThanOrEqual(4);
    expect(html.match(/>\d{2,3}</g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("renders scatter with value ticks on both axes", () => {
    const scatterPoints = [
      { x: 72.5, y: 110, xLabel: "72.5", yLabel: "110" },
      { x: 73.1, y: 125, xLabel: "73.1", yLabel: "125" },
      { x: 73.8, y: 98, xLabel: "73.8", yLabel: "98" },
    ];
    const html = renderToStaticMarkup(
      createElement(ProgressChart, {
        points: scatterPoints,
        xMetric: "weight",
        yMetric: "glucose",
        xAxisLabel: "Weight (kg)",
        yAxisLabel: "Glucose (mg/dL)",
      }),
    );
    expect(html).toContain('data-testid="progress-chart"');
    expect(html).not.toContain('data-testid="progress-chart-empty"');
  });

  it("anchors the last X date label inward so it does not clip the border", () => {
    const html = renderToStaticMarkup(
      createElement(ProgressChart, {
        points: glucosePoints,
        xMetric: "time",
        yMetric: "glucose",
        xAxisLabel: "Date",
        yAxisLabel: "Glucose (mg/dL)",
      }),
    );
    expect(html).toContain('text-anchor="end"');
    expect(html).toContain('text-anchor="start"');
  });

  it("shows empty state when fewer than 2 points", () => {
    const html = renderToStaticMarkup(
      createElement(ProgressChart, {
        points: [weightPoints[0]!],
        xMetric: "time",
        yMetric: "weight",
        xAxisLabel: "Date",
        yAxisLabel: "Weight (kg)",
      }),
    );
    expect(html).toContain('data-testid="progress-chart-empty"');
  });
});
