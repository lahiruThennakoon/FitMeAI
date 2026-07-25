import { describe, it, expect, beforeEach } from "vitest";
import {
  AUTH_RATE_LIMITS,
  RATE_LIMIT_ERROR,
  authApiRateLimitResponse,
  bucketForAuthPath,
  checkRateLimit,
  clientKeyFromHeaders,
  createMemoryStore,
  enforceAuthRateLimit,
} from "@/lib/rate-limit";

describe("checkRateLimit (sliding window)", () => {
  const store = createMemoryStore();

  beforeEach(() => {
    store.clear();
  });

  it("allows bursts within the limit", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit({
        key: "k",
        limit: 3,
        windowMs: 60_000,
        store,
        now: t0 + i,
      });
      expect(r.ok).toBe(true);
    }
  });

  it("throttles the next request over the limit", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) {
      checkRateLimit({
        key: "k",
        limit: 3,
        windowMs: 60_000,
        store,
        now: t0 + i,
      });
    }
    const denied = checkRateLimit({
      key: "k",
      limit: 3,
      windowMs: 60_000,
      store,
      now: t0 + 10,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("resets after the window elapses", () => {
    const t0 = 1_000_000;
    const windowMs = 60_000;
    for (let i = 0; i < 2; i++) {
      checkRateLimit({
        key: "k",
        limit: 2,
        windowMs,
        store,
        now: t0 + i,
      });
    }
    expect(
      checkRateLimit({
        key: "k",
        limit: 2,
        windowMs,
        store,
        now: t0 + 10,
      }).ok,
    ).toBe(false);

    const after = checkRateLimit({
      key: "k",
      limit: 2,
      windowMs,
      store,
      now: t0 + windowMs + 1,
    });
    expect(after.ok).toBe(true);
  });

  it("isolates keys", () => {
    const t0 = 1_000_000;
    checkRateLimit({
      key: "a",
      limit: 1,
      windowMs: 60_000,
      store,
      now: t0,
    });
    expect(
      checkRateLimit({
        key: "b",
        limit: 1,
        windowMs: 60_000,
        store,
        now: t0,
      }).ok,
    ).toBe(true);
  });
});

describe("clientKeyFromHeaders", () => {
  it("prefers platform headers over raw x-forwarded-for", () => {
    const h = new Headers({
      "x-forwarded-for": "203.0.113.10",
      "x-vercel-forwarded-for": "198.51.100.7",
    });
    expect(clientKeyFromHeaders(h)).toBe("ip:198.51.100.7");
  });

  it("uses cf-connecting-ip before x-real-ip", () => {
    const h = new Headers({
      "cf-connecting-ip": "203.0.113.50",
      "x-real-ip": "10.0.0.1",
    });
    expect(clientKeyFromHeaders(h)).toBe("ip:203.0.113.50");
  });

  it("falls back to x-forwarded-for then unknown", () => {
    expect(
      clientKeyFromHeaders(
        new Headers({ "x-forwarded-for": " 203.0.113.10 , 10.0.0.1" }),
      ),
    ).toBe("ip:203.0.113.10");
    expect(clientKeyFromHeaders(new Headers())).toBe("ip:unknown");
  });
});

describe("bucketForAuthPath", () => {
  it("maps credential paths to tight buckets", () => {
    expect(bucketForAuthPath("/api/auth/sign-in/email")).toBe("login");
    expect(bucketForAuthPath("/api/auth/sign-up/email")).toBe("register");
    expect(bucketForAuthPath("/api/auth/forget-password")).toBe(
      "passwordResetRequest",
    );
    expect(bucketForAuthPath("/api/auth/reset-password")).toBe("passwordReset");
  });

  it("uses apiAuth for other auth paths", () => {
    expect(bucketForAuthPath("/api/auth/get-session")).toBe("apiAuth");
  });
});

describe("authApiRateLimitResponse", () => {
  const store = createMemoryStore();

  beforeEach(() => {
    store.clear();
  });

  it("applies the login bucket to sign-in paths (not coarse apiAuth)", () => {
    const { limit } = AUTH_RATE_LIMITS.login;
    const now = 5_000_000;
    for (let i = 0; i < limit; i++) {
      const req = new Request("http://localhost/api/auth/sign-in/email", {
        headers: { "x-real-ip": "203.0.113.9" },
      });
      expect(authApiRateLimitResponse(req, { store, now: now + i })).toBeNull();
    }
    const blocked = authApiRateLimitResponse(
      new Request("http://localhost/api/auth/sign-in/email", {
        headers: { "x-real-ip": "203.0.113.9" },
      }),
      { store, now: now + limit },
    );
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
  });

  it("JSON body uses the safe RATE_LIMIT_ERROR copy", async () => {
    const { limit } = AUTH_RATE_LIMITS.apiAuth;
    const now = 6_000_000;
    for (let i = 0; i < limit; i++) {
      authApiRateLimitResponse(
        new Request("http://localhost/api/auth/get-session", {
          headers: { "x-real-ip": "203.0.113.8" },
        }),
        { store, now: now + i },
      );
    }
    const blocked = authApiRateLimitResponse(
      new Request("http://localhost/api/auth/get-session", {
        headers: { "x-real-ip": "203.0.113.8" },
      }),
      { store, now: now + limit },
    );
    const body = await blocked!.json();
    expect(body).toEqual({ error: RATE_LIMIT_ERROR });
  });
});

describe("enforceAuthRateLimit buckets", () => {
  const store = createMemoryStore();

  beforeEach(() => {
    store.clear();
  });

  it("uses the login bucket limit", () => {
    const { limit } = AUTH_RATE_LIMITS.login;
    const now = 7_000_000;
    for (let i = 0; i < limit; i++) {
      expect(
        enforceAuthRateLimit({
          bucket: "login",
          clientKey: "ip:1.1.1.1",
          store,
          now: now + i,
        }).ok,
      ).toBe(true);
    }
    expect(
      enforceAuthRateLimit({
        bucket: "login",
        clientKey: "ip:1.1.1.1",
        store,
        now: now + limit,
      }).ok,
    ).toBe(false);
  });
});
