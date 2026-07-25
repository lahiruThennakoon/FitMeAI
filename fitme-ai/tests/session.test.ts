import { describe, it, expect, vi, afterEach } from "vitest";
import { UnauthorizedError } from "@/lib/dal/guards";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

import { auth } from "@/lib/auth";
import { getSession, requireSession } from "@/lib/dal";

const getSessionMock = vi.mocked(auth.api.getSession);

afterEach(() => {
  vi.clearAllMocks();
});

describe("DAL session access (AD-6 / revoked session)", () => {
  it("getSession returns null when no session exists", async () => {
    getSessionMock.mockResolvedValue(null);
    await expect(getSession()).resolves.toBeNull();
  });

  it("getSession maps the authenticated user to a DTO", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "u1",
        email: "nimali@example.com",
        name: "Nimali",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      session: {
        id: "s1",
        userId: "u1",
        token: "token",
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await expect(getSession()).resolves.toEqual({
      id: "u1",
      email: "nimali@example.com",
      name: "Nimali",
    });
  });

  it("requireSession throws when the session row is gone (revoked)", async () => {
    getSessionMock.mockResolvedValue(null);
    await expect(requireSession()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
