import { describe, it, expect, vi, afterEach } from "vitest";
import { purgeUserOrphanData, userExists } from "@/lib/dal/user";

vi.mock("@/lib/db", () => ({
  prisma: {
    verification: {
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";

afterEach(() => {
  vi.clearAllMocks();
});

describe("purgeUserOrphanData (beforeDelete cleanup)", () => {
  it("deletes verification rows scoped to user email and id", async () => {
    await purgeUserOrphanData("user-1", "nimali@example.com");
    expect(prisma.verification.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [{ identifier: "nimali@example.com" }, { value: "user-1" }],
      },
    });
  });
});

describe("userExists (post-deletion check)", () => {
  it("returns true when user row exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
    await expect(userExists("user-1")).resolves.toBe(true);
  });

  it("returns false when user row is absent", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(userExists("user-1")).resolves.toBe(false);
  });
});
