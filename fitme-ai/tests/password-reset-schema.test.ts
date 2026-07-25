import { describe, it, expect } from "vitest";
import {
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/lib/schemas/auth";

describe("requestPasswordResetSchema", () => {
  it("accepts a valid email", () => {
    expect(
      requestPasswordResetSchema.safeParse({ email: "nimali@example.com" })
        .success,
    ).toBe(true);
  });

  it("rejects malformed email", () => {
    const parsed = requestPasswordResetSchema.safeParse({ email: "bad" });
    expect(parsed.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts token and valid password", () => {
    expect(
      resetPasswordSchema.safeParse({
        token: "abc123",
        password: "newsecurepass",
      }).success,
    ).toBe(true);
  });

  it("rejects weak password", () => {
    const parsed = resetPasswordSchema.safeParse({
      token: "abc123",
      password: "short",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects missing token", () => {
    const parsed = resetPasswordSchema.safeParse({
      token: "",
      password: "newsecurepass",
    });
    expect(parsed.success).toBe(false);
  });
});
