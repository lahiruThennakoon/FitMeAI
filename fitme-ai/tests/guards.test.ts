import { describe, it, expect } from "vitest";
import { assertOwnership, UnauthorizedError } from "@/lib/dal/guards";

describe("assertOwnership (AD-7: per-user data isolation)", () => {
  it("passes when owner matches caller", () => {
    expect(() => assertOwnership("user-1", "user-1")).not.toThrow();
  });

  it("throws Forbidden when caller does not own the resource", () => {
    expect(() => assertOwnership("user-1", "user-2")).toThrow(UnauthorizedError);
  });
});
