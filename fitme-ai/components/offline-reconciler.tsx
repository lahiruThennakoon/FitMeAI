"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { reconcileOfflineQueueAction } from "@/app/actions/offline";
import {
  loadParseQueue,
  loadWriteQueue,
  saveParseQueue,
  saveWriteQueue,
} from "@/lib/offline/browser-store";

/**
 * On reconnect, flush queued instant logs (Story 4.2 / AD-12).
 * Parse-queue items are surfaced via custom event for the log form.
 */
export function OfflineReconciler() {
  const router = useRouter();
  const running = useRef(false);

  useEffect(() => {
    async function flush() {
      if (running.current) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      const queue = loadWriteQueue();
      if (queue.length === 0) {
        // Resume parse prompts if any
        const parses = loadParseQueue();
        if (parses.length > 0) {
          window.dispatchEvent(
            new CustomEvent("fitme:resume-parse", { detail: parses }),
          );
        }
        return;
      }
      running.current = true;
      try {
        const result = await reconcileOfflineQueueAction({
          items: queue.map((q) => ({
            clientKey: q.clientKey,
            foodSlug: q.foodSlug,
            quantity: q.quantity,
            unit: q.unit,
            mealType: q.mealType,
            loggedAt: q.loggedAt,
          })),
        });
        if (result.ok) {
          saveWriteQueue([]);
          router.refresh();
        }
        const parses = loadParseQueue();
        if (parses.length > 0) {
          window.dispatchEvent(
            new CustomEvent("fitme:resume-parse", { detail: parses }),
          );
          saveParseQueue([]);
        }
      } catch {
        // Keep queue for next online event.
      } finally {
        running.current = false;
      }
    }

    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [router]);

  return null;
}
