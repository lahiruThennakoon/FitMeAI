"use client";

import { useEffect, useState } from "react";
import { AppButton } from "@/components/app-button";

/** Session-only: banner returns on the next browser visit. */
const DISMISS_KEY = "fitme-pwa-install-dismissed-session";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(display-mode: standalone)");
  if (mq.matches) return true;
  // iOS Safari / WebKit legacy home-screen launch
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

/** Any iPhone/iPad browser (all use WebKit; none fire beforeinstallprompt). */
function isIosBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function wasDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissedThisSession(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

/**
 * In-app install nudge.
 * - iOS browser: always show Add to Home Screen instructions (no BIP API).
 * - Android/desktop: show when beforeinstallprompt is available.
 * Hidden only in standalone / installed PWA mode.
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
    if (wasDismissedThisSession()) return;

    if (isIosBrowser()) {
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
    markDismissedThisSession();
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
      markDismissedThisSession();
      setVisible(false);
      setDeferred(null);
    }
  };

  return (
    <div className="pwa-install-prompt" role="region" aria-label="Install FitMe">
      <div className="pwa-install-prompt-copy">
        <p className="pwa-install-prompt-title">Add FitMe to Home Screen</p>
        <p className="pwa-install-prompt-body">
          {showIosHint
            ? "Tap Share, then Add to Home Screen to use FitMe like an app."
            : "Install FitMe for faster logging and offline quick log."}
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
