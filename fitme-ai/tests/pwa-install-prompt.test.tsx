// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

const DISMISS_KEY = "fitme-pwa-install-dismissed-session";

describe("PwaInstallPrompt", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: undefined,
    });
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile Safari/537.36",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stays hidden on Android until beforeinstallprompt fires", () => {
    render(<PwaInstallPrompt />);
    expect(screen.queryByRole("region", { name: "Install FitMe" })).toBeNull();
  });

  it("shows Install after beforeinstallprompt and dismisses for the session", () => {
    render(<PwaInstallPrompt />);

    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event("beforeinstallprompt") as Event & {
      preventDefault: () => void;
      prompt: typeof prompt;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    event.preventDefault = vi.fn();
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: "dismissed" });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(screen.getByRole("region", { name: "Install FitMe" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Install" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss install prompt" }));

    expect(screen.queryByRole("region", { name: "Install FitMe" })).toBeNull();
    expect(sessionStorage.getItem(DISMISS_KEY)).toBe("1");
  });

  it("always shows Add to Home Screen hint on iPhone Safari in browser", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );

    render(<PwaInstallPrompt />);

    expect(screen.getByRole("region", { name: "Install FitMe" })).toBeTruthy();
    expect(screen.getByText(/Add to Home Screen/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Install" })).toBeNull();
  });

  it("shows Add to Home Screen hint on iPhone Chrome (CriOS)", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
    );

    render(<PwaInstallPrompt />);

    expect(screen.getByRole("region", { name: "Install FitMe" })).toBeTruthy();
    expect(
      screen.getByText(/Tap Share, then Add to Home Screen/i),
    ).toBeTruthy();
  });

  it("hides when already running standalone", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("display-mode: standalone"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );

    render(<PwaInstallPrompt />);

    expect(screen.queryByRole("region", { name: "Install FitMe" })).toBeNull();
  });
});
