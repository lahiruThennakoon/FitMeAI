import { describe, it, expect } from "vitest";
import {
  instantFoodSchema,
  reconcileOfflineQueueSchema,
} from "@/lib/schemas/offline";

describe("offline schemas", () => {
  it("accepts instant food payload", () => {
    const parsed = instantFoodSchema.safeParse({
      clientKey: "ck-12345678",
      foodSlug: "egg",
      quantity: 1,
      unit: "piece",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts reconcile batch", () => {
    const parsed = reconcileOfflineQueueSchema.safeParse({
      items: [
        {
          clientKey: "ck-12345678",
          foodSlug: "egg",
          quantity: 1,
          unit: "piece",
          loggedAt: "2026-07-26T08:00:00.000Z",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
