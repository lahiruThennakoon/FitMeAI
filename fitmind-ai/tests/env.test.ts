import { describe, it, expect, afterEach, vi } from "vitest";
import { serverEnvStatus } from "@/lib/env";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.restoreAllMocks();
});

describe("serverEnvStatus (env fails fast, no secret leakage)", () => {
  it("reports ok when required vars are present", () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/db";
    process.env.BETTER_AUTH_SECRET = "a-sufficiently-long-secret";
    const status = serverEnvStatus();
    expect(status.ok).toBe(true);
    expect(status.missing).toEqual([]);
  });

  it("reports missing vars by name (never values)", () => {
    delete process.env.DATABASE_URL;
    delete process.env.BETTER_AUTH_SECRET;
    const status = serverEnvStatus();
    expect(status.ok).toBe(false);
    expect(status.missing).toContain("DATABASE_URL");
    expect(status.missing).toContain("BETTER_AUTH_SECRET");
  });
});
