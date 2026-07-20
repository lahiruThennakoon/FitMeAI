import { describe, it, expect } from "vitest";
import { ok, err } from "@/lib/result";

describe("result envelope (AD-13)", () => {
  it("wraps success", () => {
    const r = ok({ id: "1" });
    expect(r).toEqual({ ok: true, data: { id: "1" } });
  });

  it("wraps error with field errors", () => {
    const r = err("Invalid", { email: "required" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("Invalid");
      expect(r.fieldErrors).toEqual({ email: "required" });
    }
  });
});
