"use client";

import { APPEARANCE_STORAGE_KEY } from "@/lib/appearance/constants";
import {
  normalizeAppearancePreference,
  resolveEffectiveDark,
  type AppearancePreference,
} from "@/lib/domain/appearance/types";

export function readStoredAppearance(
  storageKey = APPEARANCE_STORAGE_KEY,
): AppearancePreference | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return null;
    return normalizeAppearancePreference(raw);
  } catch {
    return null;
  }
}

export function writeStoredAppearance(
  preference: AppearancePreference,
  storageKey = APPEARANCE_STORAGE_KEY,
): void {
  try {
    localStorage.setItem(storageKey, preference);
  } catch {
    // Private mode or blocked storage — DOM class still updates.
  }
}

export function applyAppearanceToDocument(
  preference: AppearancePreference,
): void {
  if (typeof document === "undefined") return;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = resolveEffectiveDark(preference, prefersDark);
  document.documentElement.classList.toggle("dark", dark);
}
