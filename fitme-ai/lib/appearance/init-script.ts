import { APPEARANCE_STORAGE_KEY } from "@/lib/appearance/constants";
import type { AppearancePreference } from "@/lib/domain/appearance/types";

/**
 * Synchronous inline script — runs before React paint to prevent a light flash
 * when the user chose dark. Keep in sync with ThemeProvider logic.
 * Precedence: localStorage → profile fallback → system.
 */
export function buildAppearanceInitScript(
  storageKey = APPEARANCE_STORAGE_KEY,
  fallbackAppearance: AppearancePreference | null = null,
): string {
  const fallback =
    fallbackAppearance === "light" ||
    fallbackAppearance === "dark" ||
    fallbackAppearance === "system"
      ? JSON.stringify(fallbackAppearance)
      : "null";
  return `(function(){try{var k=${JSON.stringify(storageKey)};var s=localStorage.getItem(k);var fb=${fallback};var p=s==="light"||s==="dark"||s==="system"?s:(fb==="light"||fb==="dark"||fb==="system"?fb:"system");var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
}
