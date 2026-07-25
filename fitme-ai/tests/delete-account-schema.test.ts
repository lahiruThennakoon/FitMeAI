import { describe, it, expect } from "vitest";
import { deleteAccountSchema } from "@/lib/schemas/auth";

describe("deleteAccountSchema (Story 1.5 consent)", () => {
  it("accepts valid password and DELETE confirmation", () => {
    const result = deleteAccountSchema.safeParse({
      password: "securepass",
      confirmText: "DELETE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects wrong confirmation text", () => {
    const result = deleteAccountSchema.safeParse({
      password: "securepass",
      confirmText: "delete",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = deleteAccountSchema.safeParse({
      password: "",
      confirmText: "DELETE",
    });
    expect(result.success).toBe(false);
  });
});
