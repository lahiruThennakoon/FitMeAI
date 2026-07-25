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

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Throws unless the resource's ownerId matches the caller's id. */
export function assertOwnership(ownerId: string, callerId: string): void {
  if (ownerId !== callerId) throw new UnauthorizedError("Forbidden");
}

/**
 * AD-7: Returns an owned resource or throws not-found/forbidden.
 * Missing resources throw NotFoundError to avoid enumeration.
 */
export function requireOwnedResource<T extends { userId: string }>(
  resource: T | null | undefined,
  callerId: string,
): T {
  if (!resource) throw new NotFoundError();
  assertOwnership(resource.userId, callerId);
  return resource;
}
