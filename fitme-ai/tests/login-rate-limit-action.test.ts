import { describe, it, expect, vi, afterEach } from "vitest";
import { rateLimitMessage } from "@/lib/rate-limit";
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
      // Tells the user how long to wait rather than a vague "later".
      expect(result.error).toBe(rateLimitMessage(30));
      expect(result.error).toContain("30 seconds");
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
