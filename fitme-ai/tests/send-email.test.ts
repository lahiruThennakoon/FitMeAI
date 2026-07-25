import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  isProductionMailConfigured,
  sendEmail,
  verificationPathForLog,
} from "@/lib/email/send-email";
import { logger } from "@/lib/logging";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL };
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  vi.unstubAllGlobals();
});

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("verificationPathForLog (never expose raw token)", () => {
  it("strips token query params from verification URLs", () => {
    const path = verificationPathForLog(
      "http://localhost:3000/api/auth/verify-email?token=super-secret&callbackURL=%2Flogin",
    );
    expect(path).not.toContain("super-secret");
    expect(path).toContain("/api/auth/verify-email");
    expect(path).toContain("callbackURL");
  });

  it("redacts path-embedded reset tokens", () => {
    const path = verificationPathForLog(
      "http://localhost:3000/api/auth/reset-password/super-secret-token-value",
    );
    expect(path).not.toContain("super-secret-token-value");
    expect(path).toContain("[redacted]");
  });
});

describe("isProductionMailConfigured", () => {
  it("is false without RESEND_API_KEY", () => {
    expect(isProductionMailConfigured()).toBe(false);
  });

  it("is true when RESEND_API_KEY is set", () => {
    process.env.RESEND_API_KEY = "re_test";
    expect(isProductionMailConfigured()).toBe(true);
  });
});

describe("sendEmail (mail port adapters)", () => {
  it("uses the console adapter and logs only event + userId + redacted path", async () => {
    const info = vi.spyOn(logger, "info").mockImplementation(() => undefined);
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await sendEmail({
      to: "nimali@example.com",
      subject: "Verify",
      text: "Click http://localhost:3000/api/auth/verify-email?token=abc123",
      userId: "user-1",
      verificationUrl:
        "http://localhost:3000/api/auth/verify-email?token=abc123&callbackURL=%2Flogin",
    });

    expect(info).toHaveBeenCalled();
    const [, meta] = info.mock.calls[0] ?? [];
    expect(meta).toMatchObject({
      event: "verification_email",
      userId: "user-1",
    });
    expect(JSON.stringify(meta)).not.toContain("nimali@example.com");
    expect(JSON.stringify(meta)).not.toContain("abc123");
    // Decision D2 option 3: never print raw token URLs to the console.
    expect(consoleInfo).not.toHaveBeenCalled();
  });

  it("throws in production when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(
      sendEmail({
        to: "nimali@example.com",
        subject: "Verify",
        text: "Click",
        userId: "user-1",
      }),
    ).rejects.toThrow("Mail delivery is not configured");
  });

  it("posts to Resend when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "FitMe AI <noreply@example.com>";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({
      to: "nimali@example.com",
      subject: "Verify your FitMe AI email",
      text: "Click the link",
      html: "<p>Click</p>",
      userId: "user-1",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer re_test_key",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual(["nimali@example.com"]);
    expect(body.from).toBe("FitMe AI <noreply@example.com>");
  });

  it("throws when Resend returns a non-OK response", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(
      sendEmail({
        to: "nimali@example.com",
        subject: "Verify",
        text: "Click",
        userId: "user-1",
      }),
    ).rejects.toThrow("Failed to send email");
  });

  it("throws when Resend fetch times out", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
      }),
    );

    await expect(
      sendEmail({
        to: "nimali@example.com",
        subject: "Verify",
        text: "Click",
        userId: "user-1",
      }),
    ).rejects.toThrow("Email delivery timed out");
  }, 15_000);
});
