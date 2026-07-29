import { describe, it, expect } from "vitest";
import { loginSchema } from "@/lib/schemas/auth";

describe("loginSchema (field-keyed validation for sign-in)", () => {
  it("accepts a valid email and password", () => {
    const parsed = loginSchema.safeParse({
      email: "nimali@example.com",
      password: "securepass",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("nimali@example.com");
    }
  });

  it("rejects a malformed email", () => {
    const parsed = loginSchema.safeParse({
      email: "not-an-email",
      password: "securepass",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some((i) => i.path[0] === "email"),
      ).toBe(true);
    }
  });

  it("rejects an empty password", () => {
    const parsed = loginSchema.safeParse({
      email: "nimali@example.com",
      password: "",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some((i) => i.path[0] === "password"),
      ).toBe(true);
    }
  });

  it("rejects whitespace-only passwords", () => {
    const parsed = loginSchema.safeParse({
      email: "nimali@example.com",
      password: "   ",
    });
    expect(parsed.success).toBe(false);
  });

  it("trims and lowercases email on output", () => {
    const parsed = loginSchema.safeParse({
      email: "  Nimali@Example.COM ",
      password: "securepass",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("nimali@example.com");
    }
  });

  it("rejects passwords longer than 128 characters", () => {
    const parsed = loginSchema.safeParse({
      email: "nimali@example.com",
      password: "x".repeat(129),
    });
    expect(parsed.success).toBe(false);
  });
});
