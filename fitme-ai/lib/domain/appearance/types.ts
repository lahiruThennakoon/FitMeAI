export const APPEARANCE_PREFERENCES = ["system", "light", "dark"] as const;

export type AppearancePreference = (typeof APPEARANCE_PREFERENCES)[number];

export function isAppearancePreference(
  value: string | null | undefined,
): value is AppearancePreference {
  return (
    value === "system" || value === "light" || value === "dark"
  );
}

export function normalizeAppearancePreference(
  value: string | null | undefined,
): AppearancePreference {
  return isAppearancePreference(value) ? value : "system";
}

/** Whether the effective theme should use the dark token set. */
export function resolveEffectiveDark(
  preference: AppearancePreference,
  prefersDark: boolean,
): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  return prefersDark;
}
