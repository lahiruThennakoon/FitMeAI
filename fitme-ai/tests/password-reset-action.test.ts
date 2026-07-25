import { describe, it, expect, vi, afterEach } from "vitest";
import {
  REQUEST_RESET_SUCCESS_MESSAGE,
  RESET_PASSWORD_GENERIC_ERROR,
} from "@/lib/auth/actions-shared";
import {
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/app/actions/auth";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requestPasswordResetAction (non-enumerable)", () => {
  it("returns neutral success without calling API when email invalid", async () => {
    const requestPasswordReset = vi.fn();
    const result = await requestPasswordResetAction(
      { email: "bad" },
      { requestPasswordReset },
    );
    expect(result.ok).toBe(false);
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("returns the same neutral success for any valid email", async () => {
    const requestPasswordReset = vi.fn().mockResolvedValue({ status: true });
    const result = await requestPasswordResetAction(
      { email: "nimali@example.com" },
      { requestPasswordReset },
    );
    expect(result).toEqual({
      ok: true,
      data: { message: REQUEST_RESET_SUCCESS_MESSAGE },
    });
    expect(requestPasswordReset).toHaveBeenCalledOnce();
  });
});

describe("resetPasswordAction", () => {
  it("returns generic error for invalid token", async () => {
    const resetPassword = vi.fn().mockRejectedValue({ code: "INVALID_TOKEN" });
    const result = await resetPasswordAction(
      { token: "bad", password: "newsecurepass" },
      { resetPassword },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(RESET_PASSWORD_GENERIC_ERROR);
    }
  });

  it("redirects to login on successful reset", async () => {
    const resetPassword = vi.fn().mockResolvedValue({ status: true });
    const result = await resetPasswordAction(
      { token: "valid-token", password: "newsecurepass" },
      { resetPassword },
    );
    expect(result).toEqual({
      ok: true,
      data: { redirectTo: "/login" },
    });
    expect(resetPassword).toHaveBeenCalledWith({
      body: { newPassword: "newsecurepass", token: "valid-token" },
    });
  });
});
