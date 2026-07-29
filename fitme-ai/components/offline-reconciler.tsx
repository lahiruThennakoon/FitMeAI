"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { reconcileOfflineQueueAction } from "@/app/actions/offline";
import {
  PARSE_QUEUE_EVENT,
  loadParseQueue,
  loadWriteQueue,
  saveWriteQueue,
} from "@/lib/offline/browser-store";

/**
 * On reconnect, flush queued instant logs (Story 4.2 / AD-12).
 * Parse-queue items stay in storage until the log form consumes them, so a
 * reconnect without an open log page never discards what the user typed.
 */
function announceParseQueue(): void {
  const parses = loadParseQueue();
  if (parses.length === 0) return;
  window.dispatchEvent(
    new CustomEvent(PARSE_QUEUE_EVENT, { detail: parses }),
  );
}

function reconcileMessage(result: {
  saved: number;
  skipped: number;
  failed: Array<{ foodSlug: string; reason: string }>;
}): string | null {
  if (result.failed.length === 0) {
    if (result.saved > 0) {
      return `Synced ${result.saved} offline food log${result.saved === 1 ? "" : "s"}.`;
    }
    return null;
  }
  const names = result.failed.map((f) => f.foodSlug.replace(/-/g, " ")).join(", ");
  return `Could not sync ${result.failed.length} offline log${result.failed.length === 1 ? "" : "s"} (${names}). Open Log to retry or discard them.`;
}

export function OfflineReconciler() {
  const router = useRouter();
  const running = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function flush() {
      if (running.current) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      const queue = loadWriteQueue();
      if (queue.length === 0) {
        announceParseQueue();
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
          if (result.data.failed.length === 0) {
            saveWriteQueue([]);
          } else {
            const failedKeys = new Set(
              result.data.failed.map((f) => f.clientKey),
            );
            saveWriteQueue(
              queue.filter((item) => failedKeys.has(item.clientKey)),
            );
          }
          const message = reconcileMessage(result.data);
          if (message) setNotice(message);
          router.refresh();
        }
        announceParseQueue();
      } catch {
        setNotice(
          "Offline sync failed — your queued logs are still saved locally.",
        );
      } finally {
        running.current = false;
      }
    }

    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [router]);

  if (!notice) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
      role="status"
      data-testid="offline-reconcile-notice"
    >
      <div className="mx-auto flex max-w-lg items-start justify-between gap-3">
        <p>{notice}</p>
        <button
          type="button"
          onClick={() => setNotice(null)}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900/80 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
