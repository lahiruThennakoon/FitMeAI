import { describe, it, expect } from "vitest";
import { redact } from "@/lib/logging";

describe("redact (FR-31 / AD-9: no sensitive data in logs)", () => {
  it("redacts sensitive keys by name", () => {
    const out = redact({
      email: "nimali@example.com",
      password: "hunter2",
      weight: 62,
      note: "ok",
    }) as Record<string, unknown>;
    expect(out.email).toBe("[Redacted]");
    expect(out.password).toBe("[Redacted]");
    expect(out.weight).toBe("[Redacted]");
    expect(out.note).toBe("ok");
  });

  it("redacts nested sensitive values", () => {
    const out = redact({ profile: { name: "Nimali", city: "Colombo" } }) as {
      profile: Record<string, unknown>;
    };
    expect(out.profile.name).toBe("[Redacted]");
    expect(out.profile.city).toBe("Colombo");
  });

  it("handles arrays and primitives", () => {
    expect(redact([1, "two", true])).toEqual([1, "two", true]);
    expect(redact(null)).toBeNull();
  });
});
