import { describe, it, expect, vi, afterEach } from "vitest";
import {
  REGISTER_SUCCESS_MESSAGE,
  REGISTER_GENERIC_ERROR,
  nameFromEmail,
  assertStoredPasswordIsHashed,
} from "@/lib/auth/actions-shared";
import { registerAction } from "@/app/actions/auth";
import { authRateLimitTestDeps } from "@/tests/helpers/auth-rate-limit";

afterEach(() => {
  vi.restoreAllMocks();
});

const validDeps = () => ({
  signUpEmail: vi.fn().mockResolvedValue({ user: { id: "u1" }, token: null }),
  sendVerificationEmail: vi.fn().mockResolvedValue({ status: true }),
  ...authRateLimitTestDeps,
});

describe("registerAction (non-enumerable signup + Result envelope)", () => {
  it("derives Better Auth name from the email local-part", () => {
    expect(nameFromEmail("nimali@example.com")).toBe("nimali");
  });

  it("returns fieldErrors for invalid input without calling signUp", async () => {
    const signUpEmail = vi.fn();
    const sendVerificationEmail = vi.fn();
    const result = await registerAction(
      { email: "bad", password: "short" },
      { signUpEmail, sendVerificationEmail, ...authRateLimitTestDeps },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.email).toBeDefined();
      expect(result.fieldErrors?.password).toBeDefined();
    }
    expect(signUpEmail).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns success only after signup and verification send succeed", async () => {
    const deps = validDeps();
    const result = await registerAction(
      { email: "nimali@example.com", password: "securepass" },
      deps,
    );
    expect(result).toEqual({
      ok: true,
      data: { message: REGISTER_SUCCESS_MESSAGE },
    });
    expect(deps.signUpEmail).toHaveBeenCalledOnce();
    expect(deps.sendVerificationEmail).toHaveBeenCalledOnce();
  });

  it("returns the same generic success when Better Auth accepts a duplicate (non-enumeration)", async () => {
    const deps = validDeps();
    deps.signUpEmail.mockResolvedValue({ user: null, token: null });
    const result = await registerAction(
      { email: "exists@example.com", password: "securepass" },
      deps,
    );
    expect(result).toEqual({
      ok: true,
      data: { message: REGISTER_SUCCESS_MESSAGE },
    });
    expect(deps.sendVerificationEmail).toHaveBeenCalledOnce();
  });

  it("returns generic error when signup fails", async () => {
    const deps = validDeps();
    deps.signUpEmail.mockRejectedValue(new Error("db down"));
    const result = await registerAction(
      { email: "nimali@example.com", password: "securepass" },
      deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(REGISTER_GENERIC_ERROR);
    }
    expect(deps.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns generic error when verification email delivery fails (Decision A)", async () => {
    const deps = validDeps();
    deps.sendVerificationEmail.mockRejectedValue(new Error("resend down"));
    const result = await registerAction(
      { email: "nimali@example.com", password: "securepass" },
      deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(REGISTER_GENERIC_ERROR);
    }
  });
});

describe("assertStoredPasswordIsHashed (password never plaintext)", () => {
  it("accepts a hashed-looking value that differs from plaintext", () => {
    expect(
      assertStoredPasswordIsHashed(
        "$2a$10$abcdefghijklmnopqrstuv",
        "securepass",
      ),
    ).toBe(true);
  });

  it("rejects null, plaintext, or trivial stored values", () => {
    expect(assertStoredPasswordIsHashed(null, "securepass")).toBe(false);
    expect(assertStoredPasswordIsHashed("securepass", "securepass")).toBe(
      false,
    );
    expect(assertStoredPasswordIsHashed("short", "securepass")).toBe(false);
  });
});
