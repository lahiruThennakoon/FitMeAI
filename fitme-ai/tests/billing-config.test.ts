import { describe, it, expect, vi, beforeEach } from "vitest";
import { readBillingRuntimeConfig } from "@/lib/billing/config";

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("readBillingRuntimeConfig", () => {
  it("defaults billing enabled and 5 free parses", () => {
    expect(readBillingRuntimeConfig({})).toEqual({
      billingEnabled: true,
      freeAiParsesPerDay: 5,
    });
  });

  it("disables quota when BILLING_ENABLED=false", () => {
    expect(
      readBillingRuntimeConfig({ BILLING_ENABLED: "false" }),
    ).toMatchObject({
      billingEnabled: false,
    });
  });

  it("respects FREE_AI_PARSES_PER_DAY override", () => {
    expect(
      readBillingRuntimeConfig({ FREE_AI_PARSES_PER_DAY: "10" }),
    ).toMatchObject({
      freeAiParsesPerDay: 10,
    });
  });
});
