"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyAppearanceToDocument,
  readStoredAppearance,
  writeStoredAppearance,
} from "@/lib/appearance/browser";
import {
  normalizeAppearancePreference,
  type AppearancePreference,
} from "@/lib/domain/appearance/types";

type ThemeContextValue = {
  appearance: AppearancePreference;
  setAppearance: (next: AppearancePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type Props = {
  children: ReactNode;
  /** Profile value used when localStorage has no choice yet. */
  serverAppearance?: AppearancePreference | null;
};

export function ThemeProvider({ children, serverAppearance }: Props) {
  const [appearance, setAppearanceState] = useState<AppearancePreference>(() =>
    normalizeAppearancePreference(serverAppearance),
  );

  const setAppearance = useCallback((next: AppearancePreference) => {
    writeStoredAppearance(next);
    applyAppearanceToDocument(next);
    setAppearanceState(next);
  }, []);

  useLayoutEffect(() => {
    const stored = readStoredAppearance();
    const effective =
      stored ?? normalizeAppearancePreference(serverAppearance);
    if (stored === null && serverAppearance) {
      writeStoredAppearance(normalizeAppearancePreference(serverAppearance));
    }
    applyAppearanceToDocument(effective);
    setAppearanceState(effective);
  }, [serverAppearance]);

  useEffect(() => {
    if (appearance !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppearanceToDocument("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [appearance]);

  const value = useMemo(
    () => ({ appearance, setAppearance }),
    [appearance, setAppearance],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppearance(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppearance must be used within ThemeProvider");
  }
  return ctx;
}
