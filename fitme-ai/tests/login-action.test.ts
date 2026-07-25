import { describe, it, expect, vi, afterEach } from "vitest";
import {
  LOGIN_GENERIC_ERROR,
  LOGIN_UNVERIFIED_MESSAGE,
  type LoginActionDeps,
} from "@/lib/auth/actions-shared";
import { loginAction } from "@/app/actions/auth";

afterEach(() => {
  vi.restoreAllMocks();
});

const loginDeps = (signInEmail: ReturnType<typeof vi.fn>): LoginActionDeps => ({
  signInEmail: signInEmail as NonNullable<LoginActionDeps["signInEmail"]>,
  getHeaders: async () => new Headers(),
});

describe("loginAction (generic errors + session creation)", () => {
  it("returns fieldErrors for invalid input without calling signIn", async () => {
    const signInEmail = vi.fn();
    const result = await loginAction(
      { email: "bad", password: "" },
      loginDeps(signInEmail),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.email).toBeDefined();
      expect(result.fieldErrors?.password).toBeDefined();
    }
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("returns redirect target on successful sign-in", async () => {
    const signInEmail = vi.fn().mockResolvedValue({
      token: "session-token",
      user: { id: "u1" },
    });
    const result = await loginAction(
      { email: "nimali@example.com", password: "securepass" },
      loginDeps(signInEmail),
    );
    expect(result).toEqual({
      ok: true,
      data: { redirectTo: "/dashboard" },
    });
    expect(signInEmail).toHaveBeenCalledOnce();
  });

  it("returns a generic error for invalid credentials", async () => {
    const signInEmail = vi.fn().mockRejectedValue({
      status: "UNAUTHORIZED",
      message: "Invalid email or password",
    });
    const result = await loginAction(
      { email: "nimali@example.com", password: "wrongpass" },
      loginDeps(signInEmail),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(LOGIN_GENERIC_ERROR);
    }
  });

  it("returns supportive guidance when email is not verified", async () => {
    const signInEmail = vi.fn().mockRejectedValue({
      status: "FORBIDDEN",
      code: "EMAIL_NOT_VERIFIED",
    });
    const result = await loginAction(
      { email: "nimali@example.com", password: "securepass" },
      loginDeps(signInEmail),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(LOGIN_UNVERIFIED_MESSAGE);
    }
  });
});
