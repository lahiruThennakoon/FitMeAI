import { describe, it, expect } from "vitest";
import {
  EMAIL_INVALID_MESSAGE,
  EMAIL_REQUIRED_MESSAGE,
  normalizeEmail,
  validateEmail,
} from "@/lib/domain/auth/email";

describe("validateEmail (shared auth email/username)", () => {
  const rejected = [
    "",
    "   ",
    "user",
    "user@",
    "@example.com",
    "user example@example.com",
    "user@example",
    "user..name@example.com",
    "user@example..com",
  ] as const;

  it.each(rejected)("rejects %j", (raw) => {
    const result = validateEmail(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  const accepted = [
    "user@example.com",
    "user.name@example.com",
    "user+fitness@example.com",
    "USER@EXAMPLE.COM",
  ] as const;

  it.each(accepted)("accepts %j", (raw) => {
    const result = validateEmail(raw);
    expect(result).toEqual({ ok: true, email: normalizeEmail(raw) });
  });

  it("trims and lowercases before accepting", () => {
    expect(validateEmail("  User.Name@Example.COM  ")).toEqual({
      ok: true,
      email: "user.name@example.com",
    });
  });

  it("rejects whitespace-only input with a required message", () => {
    const result = validateEmail("   ");
    expect(result).toEqual({ ok: false, message: EMAIL_REQUIRED_MESSAGE });
  });

  it("rejects internal whitespace with an invalid message", () => {
    const result = validateEmail("user example@example.com");
    expect(result).toEqual({ ok: false, message: EMAIL_INVALID_MESSAGE });
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  A@B.COM ")).toBe("a@b.com");
  });
});
