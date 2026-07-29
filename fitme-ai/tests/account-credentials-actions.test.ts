import { describe, it, expect, vi, afterEach } from "vitest";
import { changeEmailAction, changePasswordAction } from "@/app/actions/auth";
import {
  CHANGE_EMAIL_SAME_ADDRESS_ERROR,
  CHANGE_PASSWORD_GENERIC_ERROR,
  changeEmailPendingMessage,
} from "@/lib/auth/actions-shared";

afterEach(() => {
  vi.restoreAllMocks();
});

const allowLimit = {
  getClientKey: async () => "ip:test",
  rateLimit: () => ({ ok: true as const, remaining: 9 }),
};

const denyLimit = {
  getClientKey: async () => "ip:test",
  rateLimit: () => ({ ok: false as const, retryAfterSec: 30 }),
};

const headers = async () => new Headers();

describe("changePasswordAction", () => {
  it("changes the password and signs other devices out", async () => {
    const changePassword = vi.fn().mockResolvedValue({});
    const result = await changePasswordAction(
      { currentPassword: "oldsecurepass", newPassword: "newsecurepass" },
      { changePassword, getHeaders: headers, ...allowLimit },
    );

    expect(result.ok).toBe(true);
    const [args] = changePassword.mock.calls[0] as [
      { body: { revokeOtherSessions?: boolean } },
    ];
    expect(args.body.revokeOtherSessions).toBe(true);
  });

  it("requires the current password so a stolen session can't take over", async () => {
    const changePassword = vi.fn();
    const result = await changePasswordAction(
      { currentPassword: "", newPassword: "newsecurepass" },
      { changePassword, getHeaders: headers, ...allowLimit },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.currentPassword).toBeTruthy();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("rejects a new password that is really the old one", async () => {
    const changePassword = vi.fn();
    const result = await changePasswordAction(
      { currentPassword: "samesecurepass", newPassword: "samesecurepass" },
      { changePassword, getHeaders: headers, ...allowLimit },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.newPassword).toBeTruthy();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("enforces the minimum length on the new password", async () => {
    const changePassword = vi.fn();
    const result = await changePasswordAction(
      { currentPassword: "oldsecurepass", newPassword: "short" },
      { changePassword, getHeaders: headers, ...allowLimit },
    );
    expect(result.ok).toBe(false);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("reports a wrong current password without revealing which part failed", async () => {
    const changePassword = vi.fn().mockRejectedValue(new Error("invalid"));
    const result = await changePasswordAction(
      { currentPassword: "wrongsecurepass", newPassword: "newsecurepass" },
      { changePassword, getHeaders: headers, ...allowLimit },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(CHANGE_PASSWORD_GENERIC_ERROR);
  });

  it("is rate limited like sign-in, since it verifies a password", async () => {
    const changePassword = vi.fn();
    const result = await changePasswordAction(
      { currentPassword: "oldsecurepass", newPassword: "newsecurepass" },
      { changePassword, getHeaders: headers, ...denyLimit },
    );
    expect(result.ok).toBe(false);
    expect(changePassword).not.toHaveBeenCalled();
  });
});

describe("changeEmailAction", () => {
  const session = async () => ({ id: "u1", email: "nimali@example.com" });

  it("asks Better Auth to start the change and reports where the link went", async () => {
    const changeEmail = vi.fn().mockResolvedValue({});
    const result = await changeEmailAction(
      { newEmail: "new@example.com" },
      { changeEmail, getHeaders: headers, getSession: session, ...allowLimit },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.message).toBe(
        changeEmailPendingMessage("nimali@example.com"),
      );
      // The approval goes to the address on file, not the new one.
      expect(result.data.message).toContain("nimali@example.com");
      expect(result.data.message).not.toContain("new@example.com");
    }
    const [args] = changeEmail.mock.calls[0] as [
      { body: { newEmail: string } },
    ];
    expect(args.body.newEmail).toBe("new@example.com");
  });

  it("does not treat a re-entry of the current address as a change", async () => {
    const changeEmail = vi.fn();
    const result = await changeEmailAction(
      { newEmail: "nimali@example.com" },
      { changeEmail, getHeaders: headers, getSession: session, ...allowLimit },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(CHANGE_EMAIL_SAME_ADDRESS_ERROR);
    expect(changeEmail).not.toHaveBeenCalled();
  });

  it("ignores casing when comparing against the current address", async () => {
    const changeEmail = vi.fn();
    const result = await changeEmailAction(
      { newEmail: "NIMALI@example.com" },
      { changeEmail, getHeaders: headers, getSession: session, ...allowLimit },
    );
    expect(result.ok).toBe(false);
    expect(changeEmail).not.toHaveBeenCalled();
  });

  it("stays neutral when the new address is already taken", async () => {
    // A failure here must look identical to success, or the form becomes an
    // account-enumeration oracle.
    const changeEmail = vi.fn().mockRejectedValue(new Error("taken"));
    const result = await changeEmailAction(
      { newEmail: "someone-else@example.com" },
      { changeEmail, getHeaders: headers, getSession: session, ...allowLimit },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.message).toBe(
        changeEmailPendingMessage("nimali@example.com"),
      );
    }
  });

  it("rejects a malformed address before contacting Better Auth", async () => {
    const changeEmail = vi.fn();
    const result = await changeEmailAction(
      { newEmail: "not-an-email" },
      { changeEmail, getHeaders: headers, getSession: session, ...allowLimit },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.newEmail).toBeTruthy();
    expect(changeEmail).not.toHaveBeenCalled();
  });

  it("refuses without a session", async () => {
    const changeEmail = vi.fn();
    const result = await changeEmailAction(
      { newEmail: "new@example.com" },
      {
        changeEmail,
        getHeaders: headers,
        getSession: async () => null,
        ...allowLimit,
      },
    );
    expect(result.ok).toBe(false);
    expect(changeEmail).not.toHaveBeenCalled();
  });

  it("is rate limited", async () => {
    const changeEmail = vi.fn();
    const result = await changeEmailAction(
      { newEmail: "new@example.com" },
      { changeEmail, getHeaders: headers, getSession: session, ...denyLimit },
    );
    expect(result.ok).toBe(false);
    expect(changeEmail).not.toHaveBeenCalled();
  });
});
