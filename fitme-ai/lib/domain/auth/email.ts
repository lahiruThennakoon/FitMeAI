/** RFC 5321 practical maximum for an email address. */
export const EMAIL_MAX_LENGTH = 254;

export const EMAIL_REQUIRED_MESSAGE = "Enter your email address.";
export const EMAIL_INVALID_MESSAGE = "Enter a valid email address.";
export const EMAIL_TOO_LONG_MESSAGE = "Email address is too long.";

export type EmailValidationResult =
  | { ok: true; email: string }
  | { ok: false; message: string };

/**
 * Normalize email for storage and lookup — trim and lowercase.
 * Call only after {@link validateEmail} succeeds, or when re-normalizing known-good input.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Validate and normalize an email/username for auth flows.
 * Shared by Zod schemas (server) and client forms (immediate feedback).
 */
export function validateEmail(raw: unknown): EmailValidationResult {
  if (typeof raw !== "string") {
    return { ok: false, message: EMAIL_REQUIRED_MESSAGE };
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: EMAIL_REQUIRED_MESSAGE };
  }

  if (/\s/.test(trimmed)) {
    return { ok: false, message: EMAIL_INVALID_MESSAGE };
  }

  const email = trimmed.toLowerCase();

  if (email.length > EMAIL_MAX_LENGTH) {
    return { ok: false, message: EMAIL_TOO_LONG_MESSAGE };
  }

  if (!isReasonableEmailStructure(email)) {
    return { ok: false, message: EMAIL_INVALID_MESSAGE };
  }

  return { ok: true, email };
}

function isReasonableEmailStructure(email: string): boolean {
  const at = email.indexOf("@");
  if (at <= 0) return false;
  if (email.indexOf("@", at + 1) !== -1) return false;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  return isValidLocalPart(local) && isValidDomainPart(domain);
}

function isValidLocalPart(local: string): boolean {
  if (local.length === 0 || local.length > 64) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (local.includes("..")) return false;
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local);
}

function isValidDomainPart(domain: string): boolean {
  if (domain.length === 0 || domain.length > 253) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.includes("..")) return false;
  if (!domain.includes(".")) return false;

  const labels = domain.split(".");
  if (labels.some((label) => label.length === 0)) return false;

  const tld = labels[labels.length - 1]!;
  if (tld.length < 2) return false;

  for (const label of labels) {
    if (label.length > 63) return false;
    if (!/^[a-z0-9-]+$/i.test(label)) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
  }

  return true;
}
