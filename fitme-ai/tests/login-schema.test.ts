import { describe, it, expect } from "vitest";
import { loginSchema } from "@/lib/schemas/auth";

describe("loginSchema (field-keyed validation for sign-in)", () => {
  it("accepts a valid email and password", () => {
    const parsed = loginSchema.safeParse({
      email: "nimali@example.com",
      password: "securepass",
    });
    expect(parsed.success).toBe(true);
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
});
