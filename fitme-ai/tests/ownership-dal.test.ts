import { describe, it, expect } from "vitest";
import {
  assertOwnership,
  NotFoundError,
  requireOwnedResource,
  UnauthorizedError,
} from "@/lib/dal/guards";

describe("requireOwnedResource (AD-7 DAL scoping)", () => {
  it("returns the resource when caller owns it", () => {
    const resource = { id: "r1", userId: "user-1" };
    expect(requireOwnedResource(resource, "user-1")).toBe(resource);
  });

  it("throws NotFound when resource is missing (non-enumerable)", () => {
    expect(() => requireOwnedResource(null, "user-1")).toThrow(NotFoundError);
    expect(() => requireOwnedResource(undefined, "user-1")).toThrow(NotFoundError);
  });

  it("throws Forbidden when caller does not own the resource", () => {
    expect(() =>
      requireOwnedResource({ id: "r1", userId: "user-1" }, "user-2"),
    ).toThrow(UnauthorizedError);
  });
});

describe("assertOwnership (regression)", () => {
  it("still passes for matching ids", () => {
    expect(() => assertOwnership("a", "a")).not.toThrow();
  });
});
