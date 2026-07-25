import { describe, it, expect, vi, afterEach } from "vitest";
import { logger, redact } from "@/lib/logging";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("redact (FR-31 / AD-9: no sensitive data in logs)", () => {
  it("redacts sensitive keys by name", () => {
    const out = redact({
      email: "nimali@example.com",
      password: "hunter2",
      weight: 62,
      authorization: "Bearer secret",
      cookie: "session=abc",
      note: "ok",
    }) as Record<string, unknown>;
    expect(out.email).toBe("[Redacted]");
    expect(out.password).toBe("[Redacted]");
    expect(out.weight).toBe("[Redacted]");
    expect(out.authorization).toBe("[Redacted]");
    expect(out.cookie).toBe("[Redacted]");
    expect(out.note).toBe("ok");
  });

  it("redacts nested sensitive values", () => {
    const out = redact({ profile: { name: "Nimali", city: "Colombo" } }) as {
      profile: Record<string, unknown>;
    };
    expect(out.profile.name).toBe("[Redacted]");
    expect(out.profile.city).toBe("Colombo");
  });

  it("never emits raw Error.message (may contain emails)", () => {
    const out = redact(
      new Error("User nimali@example.com failed login"),
    ) as Record<string, unknown>;
    expect(out.name).toBe("Error");
    expect(out.message).toBe("[Redacted]");
    expect(JSON.stringify(out)).not.toContain("nimali@example.com");
  });

  it("redacts Error-like plain objects and message/detail keys", () => {
    const like = redact({
      name: "APIError",
      message: "Invalid for nimali@example.com",
      status: 401,
    }) as Record<string, unknown>;
    expect(like.message).toBe("[Redacted]");
    expect(JSON.stringify(like)).not.toContain("nimali@example.com");

    const keyed = redact({
      detail: "nimali@example.com",
      outcome: "rejected",
    }) as Record<string, unknown>;
    expect(keyed.detail).toBe("[Redacted]");
    expect(keyed.outcome).toBe("rejected");
  });

  it("handles arrays and primitives", () => {
    expect(redact([1, "two", true])).toEqual([1, "two", true]);
    expect(redact(null)).toBeNull();
  });

  it("logger.error redacts PII on error paths before console emit", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logger.error("auth.login.failed", {
      outcome: "rejected",
      email: "nimali@example.com",
      err: new Error("Invalid password for nimali@example.com"),
    });
    expect(spy).toHaveBeenCalledOnce();
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).not.toContain("nimali@example.com");
    expect(line).toContain("[Redacted]");
    expect(line).toContain("auth.login.failed");
  });
});
