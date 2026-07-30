import { buildAppearanceInitScript } from "@/lib/appearance/init-script";
import type { AppearancePreference } from "@/lib/domain/appearance/types";

type Props = {
  /** Profile value when localStorage has no choice yet (signed-in restore). */
  fallbackAppearance?: AppearancePreference | null;
};

/** Blocking inline script — must run before first paint (FOUC guard). */
export function ThemeInit({ fallbackAppearance = null }: Props) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: buildAppearanceInitScript(undefined, fallbackAppearance),
      }}
    />
  );
}
