/**
 * Pure authorization guards (AD-7). Kept free of `server-only`/DB imports so
 * they are unit-testable in isolation and reusable across DAL modules.
 */

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Throws unless the resource's ownerId matches the caller's id. */
export function assertOwnership(ownerId: string, callerId: string): void {
  if (ownerId !== callerId) throw new UnauthorizedError("Forbidden");
}
