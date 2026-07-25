import "server-only";
import { prisma } from "@/lib/db";

/**
 * Remove verification tokens tied to a user before hard delete (Story 1.5 / AD-8).
 * Verification rows have no FK to User; clean them explicitly in beforeDelete.
 */
export async function purgeUserOrphanData(
  userId: string,
  email: string,
): Promise<void> {
  await prisma.verification.deleteMany({
    where: {
      OR: [{ identifier: email }, { value: userId }],
    },
  });
}

/** Returns whether a user row still exists (post-deletion isolation checks). */
export async function userExists(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return user !== null;
}
