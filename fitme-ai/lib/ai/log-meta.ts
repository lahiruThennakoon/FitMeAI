/**
 * Safe AI log labels (AD-9). Purpose must be a short machine label — never meal text.
 */

const PURPOSE_MAX = 64;

/** Normalize purpose for logs: short token, no free-form health content. */
export function purposeForLog(purpose: string): string {
  const cleaned = purpose
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, PURPOSE_MAX);
  return cleaned || "unknown";
}
