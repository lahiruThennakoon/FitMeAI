import { describe, it, expect } from "vitest";
import { registerSchema } from "@/lib/schemas/auth";

describe("registerSchema (field-keyed validation for registration)", () => {
  it("accepts a valid email and password (≥8 chars)", () => {
    const parsed = registerSchema.safeParse({
      email: "nimali@example.com",
      password: "securepass",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("nimali@example.com");
    }
  });

  it("rejects a malformed email with an email field error", () => {
    const parsed = registerSchema.safeParse({
      email: "not-an-email",
      password: "securepass",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const emailIssue = parsed.error.issues.find((i) => i.path[0] === "email");
      expect(emailIssue?.message).toBe("Enter a valid email address.");
    }
  });

  it("rejects a weak password with a password field error", () => {
    const parsed = registerSchema.safeParse({
      email: "nimali@example.com",
      password: "short",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.find(
        (i) => i.path[0] === "password",
      );
      expect(passwordIssue?.message).toBe("Use at least 8 characters.");
    }
  });

  it("rejects passwords longer than 128 characters", () => {
    const parsed = registerSchema.safeParse({
      email: "nimali@example.com",
      password: "a".repeat(129),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.find(
        (i) => i.path[0] === "password",
      );
      expect(passwordIssue?.message).toBe(
        "Password must be at most 128 characters.",
      );
    }
  });

  it("rejects whitespace-only passwords and normalizes emails", () => {
    const parsed = registerSchema.safeParse({
      email: "  nimali@example.com  ",
      password: "securepass",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("nimali@example.com");
    }
    expect(
      registerSchema.safeParse({
        email: "nimali@example.com",
        password: "        ",
      }).success,
    ).toBe(false);
  });

  it("lowercases mixed-case emails on output", () => {
    const parsed = registerSchema.safeParse({
      email: "Nimali+Fit@Example.COM",
      password: "securepass",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("nimali+fit@example.com");
    }
  });
});
