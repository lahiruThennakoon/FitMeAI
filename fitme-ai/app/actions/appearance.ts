"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/dal";
import { updateAppearancePreference } from "@/lib/dal/profile";
import { logger } from "@/lib/logging";
import { err, ok, type Result } from "@/lib/result";
import { appearancePreferenceSchema } from "@/lib/schemas/profile";
import type { ProfileDto } from "@/lib/domain/targets/types";

export type SaveAppearanceResult = Result<{ profile: ProfileDto | null }>;

export type AppearanceActionDeps = {
  requireSession?: typeof requireSession;
  updateAppearancePreference?: typeof updateAppearancePreference;
  revalidate?: (path: string) => void;
};

/** Instant appearance toggle from Settings — localStorage is updated client-side first. */
export async function saveAppearancePreferenceAction(
  input: unknown,
  deps: AppearanceActionDeps = {},
): Promise<SaveAppearanceResult> {
  const parsed = appearancePreferenceSchema.safeParse(input);
  if (!parsed.success) {
    return err("Could not save that appearance setting.");
  }

  const getSession = deps.requireSession ?? requireSession;
  const update = deps.updateAppearancePreference ?? updateAppearancePreference;
  const revalidate = deps.revalidate ?? revalidatePath;

  let userId: string;
  try {
    userId = (await getSession()).id;
  } catch {
    return ok({ profile: null });
  }

  try {
    const profile = await update(userId, parsed.data.appearancePreference);
    revalidate("/settings");
    logger.info("profile.appearance.updated", { outcome: "accepted", userId });
    return ok({ profile });
  } catch {
    logger.error("profile.appearance.failed", { outcome: "error", userId });
    return err("Could not save appearance to your profile. It still applies on this device.");
  }
}
