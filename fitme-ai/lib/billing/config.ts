import "server-only";

import { freeAiParseLimit } from "@/lib/domain/billing/entitlements";

export type BillingRuntimeConfig = {
  /** When false, all users skip AI parse quota (closed beta). */
  billingEnabled: boolean;
  freeAiParsesPerDay: number;
};

/**
 * Read billing/freemium config from env. Values are never logged.
 * `BILLING_ENABLED=false` treats everyone as Pro for quota purposes.
 */
export function readBillingRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): BillingRuntimeConfig {
  const billingEnabled = env.BILLING_ENABLED?.trim().toLowerCase() !== "false";
  const limitRaw = Number(env.FREE_AI_PARSES_PER_DAY ?? "5");

  return {
    billingEnabled,
    freeAiParsesPerDay: freeAiParseLimit(limitRaw),
  };
}
