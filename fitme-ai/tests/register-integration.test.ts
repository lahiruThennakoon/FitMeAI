import { describe, it, expect, vi, afterEach } from "vitest";
import {
  REGISTER_GENERIC_ERROR,
  REGISTER_SUCCESS_MESSAGE,
} from "@/lib/auth/actions-shared";
import { registerAction } from "@/app/actions/auth";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("registerAction verification delivery (Decision A)", () => {
  it("does not return success when verification send fails after signup", async () => {
    const result = await registerAction(
      { email: "integration@example.com", password: "securepass" },
      {
        signUpEmail: vi.fn().mockResolvedValue({ user: { id: "u-int" } }),
        sendVerificationEmail: vi
          .fn()
          .mockRejectedValue(new Error("mail provider down")),
      },
    );

    expect(result).toEqual({ ok: false, error: REGISTER_GENERIC_ERROR });
  });

  it("requires verification send to complete before success message", async () => {
    const sendVerificationEmail = vi.fn().mockResolvedValue({ status: true });
    const result = await registerAction(
      { email: "integration@example.com", password: "securepass" },
      {
        signUpEmail: vi.fn().mockResolvedValue({ user: { id: "u-int" } }),
        sendVerificationEmail,
      },
    );

    expect(result).toEqual({
      ok: true,
      data: { message: REGISTER_SUCCESS_MESSAGE },
    });
    expect(sendVerificationEmail).toHaveBeenCalledWith({
      body: {
        email: "integration@example.com",
        callbackURL: "/login",
      },
    });
  });
});
