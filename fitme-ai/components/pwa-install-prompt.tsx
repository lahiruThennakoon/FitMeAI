"use client";

import { useEffect, useState } from "react";
import { AppButton } from "@/components/app-button";

const DISMISS_KEY = "fitme-pwa-install-dismissed";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(display-mode: standalone)");
  if (mq.matches) return true;
  // iOS Safari legacy
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // Chrome/Firefox/Edge on iOS do not support Add to Home Screen the same way.
  return (
    iOS &&
    /Safari/.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  );
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * In-app install nudge: Android/desktop via beforeinstallprompt;
 * iOS Safari gets Share → Add to Home Screen instructions.
 */
export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneDisplay()) return;
    if (wasDismissedRecently()) return;

    if (isIosSafari()) {
      setShowIosHint(true);
      setVisible(true);
      return;
    }

    const onBip = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    markDismissed();
    setVisible(false);
    setDeferred(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      // User dismissed or browser rejected — keep quiet
    } finally {
      markDismissed();
      setVisible(false);
      setDeferred(null);
    }
  };

  return (
    <div className="pwa-install-prompt" role="region" aria-label="Install FitMe">
      <div className="pwa-install-prompt-copy">
        <p className="pwa-install-prompt-title">Install FitMe</p>
        <p className="pwa-install-prompt-body">
          {showIosHint
            ? "Tap Share, then Add to Home Screen for a full-screen app."
            : "Add FitMe to your home screen for faster logging."}
        </p>
      </div>
      <div className="pwa-install-prompt-actions">
        {!showIosHint && deferred ? (
          <AppButton type="button" size="sm" variant="primary" onClick={install}>
            Install
          </AppButton>
        ) : null}
        <AppButton
          type="button"
          size="sm"
          variant="secondary"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
        >
          Not now
        </AppButton>
      </div>
    </div>
  );
}
