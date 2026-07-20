import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { UnauthorizedError, assertOwnership } from "@/lib/dal/guards";

/**
 * Data Access Layer entry point (AD-1, AD-7).
 *
 * The DAL is the single choke point for authentication + authorization. Every
 * data-access function in `lib/dal/*` must resolve the current user through
 * `requireSession()` (or `getSession()`), scope queries by the authenticated
 * userId, and return minimal DTOs — never raw Prisma records — to callers.
 */

export { UnauthorizedError, assertOwnership };

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
};

/** Returns the current session user, or null when unauthenticated. */
export async function getSession(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
  };
}

/** Returns the current session user, or throws UnauthorizedError. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new UnauthorizedError();
  return user;
}
