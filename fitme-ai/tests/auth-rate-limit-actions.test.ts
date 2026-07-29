import { describe, it, expect, vi, afterEach } from "vitest";
import { RATE_LIMIT_ERROR } from "@/lib/auth/actions-shared";
import { rateLimitMessage } from "@/lib/rate-limit";
import {
  registerAction,
  requestPasswordResetAction,
  resetPasswordAction,
  deleteAccountAction,
} from "@/app/actions/auth";

afterEach(() => {
  vi.restoreAllMocks();
});

const denyLimit = {
  getClientKey: async () => "ip:test",
  rateLimit: () => ({ ok: false as const, retryAfterSec: 30 }),
};

/** A throttled call names the wait; only the fail-closed path stays vague. */
const DENIED_MESSAGE = rateLimitMessage(30);

describe("auth Server Action rate-limit deny paths (Story 1.8)", () => {
  it("blocks register without calling Better Auth", async () => {
    const signUpEmail = vi.fn();
    const sendVerificationEmail = vi.fn();
    const result = await registerAction(
      { email: "nimali@example.com", password: "securepass" },
      { signUpEmail, sendVerificationEmail, ...denyLimit },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(DENIED_MESSAGE);
    expect(signUpEmail).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("blocks password-reset request without calling Better Auth", async () => {
    const requestPasswordReset = vi.fn();
    const result = await requestPasswordResetAction(
      { email: "nimali@example.com" },
      { requestPasswordReset, ...denyLimit },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(DENIED_MESSAGE);
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("blocks password-reset submit without calling Better Auth", async () => {
    const resetPassword = vi.fn();
    const result = await resetPasswordAction(
      { token: "tok", password: "newsecurepass" },
      { resetPassword, ...denyLimit },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(DENIED_MESSAGE);
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("blocks account deletion without calling Better Auth", async () => {
    const deleteUser = vi.fn();
    const result = await deleteAccountAction(
      { password: "securepass", confirmText: "DELETE" },
      {
        deleteUser: deleteUser as never,
        getHeaders: async () => new Headers(),
        ...denyLimit,
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(DENIED_MESSAGE);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("fail-closes when getClientKey throws", async () => {
    const signIn = vi.fn();
    const { loginAction } = await import("@/app/actions/auth");
    const result = await loginAction(
      { email: "nimali@example.com", password: "securepass" },
      {
        signInEmail: signIn as never,
        getHeaders: async () => new Headers(),
        getClientKey: async () => {
          throw new Error("headers unavailable");
        },
      },
    );
    expect(result.ok).toBe(false);
    // No window to report when we never got a client key.
    if (!result.ok) expect(result.error).toBe(RATE_LIMIT_ERROR);
    expect(signIn).not.toHaveBeenCalled();
  });
});
