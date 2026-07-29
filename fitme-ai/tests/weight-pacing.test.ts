import { describe, it, expect } from "vitest";
import {
  evaluateWeightPacing,
  shouldShowWeightPacing,
} from "@/lib/domain/weight/pacing";

describe("shouldShowWeightPacing (Story 6.3)", () => {
  it("shows when weekly change is overridden", () => {
    expect(
      shouldShowWeightPacing({
        plannedWeeklyChangeG: -1000,
        weeklyChangeOverridden: true,
      }),
    ).toBe(true);
  });

  it("hides when plan is zero", () => {
    expect(
      shouldShowWeightPacing({
        plannedWeeklyChangeG: 0,
        weeklyChangeOverridden: true,
      }),
    ).toBe(false);
  });

  it("shows for aggressive suggested plan without override", () => {
    expect(
      shouldShowWeightPacing({
        plannedWeeklyChangeG: -600,
        weeklyChangeOverridden: false,
      }),
    ).toBe(true);
  });
});

describe("evaluateWeightPacing (Story 6.3)", () => {
  const plan1kgLoss = -1000;

  it("returns insufficient_data with one weigh-in", () => {
    const r = evaluateWeightPacing({
      entries: [{ weightG: 80_000, recordedAt: "2026-07-27T08:00:00.000Z" }],
      plannedWeeklyChangeG: plan1kgLoss,
      weeklyChangeOverridden: true,
    });
    expect(r.status).toBe("insufficient_data");
  });

  it("detects slower loss than 1 kg/week plan", () => {
    const r = evaluateWeightPacing({
      entries: [
        { weightG: 80_000, recordedAt: "2026-07-01T08:00:00.000Z" },
        { weightG: 79_700, recordedAt: "2026-07-15T08:00:00.000Z" },
      ],
      plannedWeeklyChangeG: plan1kgLoss,
      weeklyChangeOverridden: true,
    });
    expect(r.status).toBe("ready");
    if (r.status === "ready") {
      expect(r.comparison).toBe("behind");
      expect(r.actualWeeklyChangeG).toBeGreaterThan(plan1kgLoss);
      expect(r.message).toMatch(/slower/i);
    }
  });

  it("detects on-pace loss", () => {
    const r = evaluateWeightPacing({
      entries: [
        { weightG: 80_000, recordedAt: "2026-07-01T08:00:00.000Z" },
        { weightG: 79_000, recordedAt: "2026-07-08T08:00:00.000Z" },
      ],
      plannedWeeklyChangeG: plan1kgLoss,
      weeklyChangeOverridden: true,
    });
    expect(r.status).toBe("ready");
    if (r.status === "ready") {
      expect(r.comparison).toBe("on_pace");
    }
  });

  it("is hidden when plan is mild and not overridden", () => {
    const r = evaluateWeightPacing({
      entries: [
        { weightG: 80_000, recordedAt: "2026-07-01T08:00:00.000Z" },
        { weightG: 79_900, recordedAt: "2026-07-08T08:00:00.000Z" },
      ],
      plannedWeeklyChangeG: -200,
      weeklyChangeOverridden: false,
    });
    expect(r.status).toBe("hidden");
  });
});
