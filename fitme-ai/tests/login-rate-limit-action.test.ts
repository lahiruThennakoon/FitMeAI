import { describe, it, expect, vi, afterEach } from "vitest";
import { RATE_LIMIT_ERROR } from "@/lib/auth/actions-shared";
import { loginAction } from "@/app/actions/auth";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loginAction rate limiting (Story 1.8)", () => {
  it("blocks when rateLimit denies and does not call signIn", async () => {
    const signInEmail = vi.fn();
    const rateLimit = vi.fn().mockReturnValue({
      ok: false,
      retryAfterSec: 30,
    });
    const result = await loginAction(
      { email: "nimali@example.com", password: "securepass" },
      {
        signInEmail: signInEmail as never,
        getHeaders: async () => new Headers(),
        getClientKey: async () => "ip:test",
        rateLimit,
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(RATE_LIMIT_ERROR);
    }
    expect(signInEmail).not.toHaveBeenCalled();
    expect(rateLimit).toHaveBeenCalledWith("login", "ip:test");
  });

  it("proceeds when rateLimit allows", async () => {
    const signInEmail = vi.fn().mockResolvedValue({ token: "t" });
    const result = await loginAction(
      { email: "nimali@example.com", password: "securepass" },
      {
        signInEmail: signInEmail as never,
        getHeaders: async () => new Headers(),
        getClientKey: async () => "ip:test",
        rateLimit: () => ({ ok: true, remaining: 9 }),
      },
    );
    expect(result.ok).toBe(true);
    expect(signInEmail).toHaveBeenCalledOnce();
  });
});
