/**
 * AI safety guardrails (Story 2.9 / FR-17 / AD-5).
 * Pure checks — no I/O, never log the scanned text.
 */

export const SAFETY_SYSTEM_INSTRUCTION = [
  "Safety rules (non-negotiable):",
  "Never diagnose conditions, interpret labs, or give medical advice.",
  "Never recommend medication, supplements, dosages, or treatments.",
  "Never use guilt, shame, body insults, or judgmental language.",
  "Be supportive and neutral. Where health decisions arise, suggest consulting a qualified professional.",
  "Nutrition numbers for unmatched foods are estimates only — never claim they are exact database, lab, or medically confirmed values.",
  "Do not invent precise values presented as known facts.",
].join(" ");

export const GUARDRAIL_REGEN_HINT =
  "Your previous response was blocked by safety guardrails. Reply again with structured data only: no medical advice, no supplements/medication, no shame or judgment, and no false claims of database/lab precision.";

export type GuardrailReason =
  | "medical_advice"
  | "shaming"
  | "false_precision";

export type GuardrailCheck =
  | { ok: true }
  | { ok: false; reason: GuardrailReason };

/** Phrase patterns — avoid bare tokens like "fat" that collide with macros. */
const MEDICAL_PATTERNS: RegExp[] = [
  /\bdiagnos(?:e|ed|is|ing)\b/i,
  /\byou have (?:diabetes|cancer|anorexia|bulimia|hypertension|thyroid)\b/i,
  /\b(?:take|taking|prescrib(?:e|ed)|recommend(?:ing)?)\b[\s\S]{0,48}\b(?:medication|medicine|drug|supplement|metformin|insulin|steroid|ozempic|antidepressant)\b/i,
  /\b(?:medication|medicine|supplement)s?\b[\s\S]{0,32}\b(?:for your|to treat|to cure|dosage)\b/i,
  /\b(?:cure|treat(?:ment)? for)\b[\s\S]{0,24}\b(?:disease|disorder|condition)\b/i,
];

const SHAMING_PATTERNS: RegExp[] = [
  /\b(?:should be ashamed|disgusting|pathetic|worthless|lazy pig)\b/i,
  /\b(?:guilt|shame)(?:ful)?\b[\s\S]{0,24}\b(?:eat|food|meal|body)\b/i,
  /\byou(?:'re| are) (?:fat|obese|ugly|gross|disgusting)\b/i,
];

const FALSE_PRECISION_PATTERNS: RegExp[] = [
  /\bexact (?:usda|database|lab)\b/i,
  /\b(?:medically|clinically) (?:exact|confirmed|precise)\b/i,
  /\b(?:confirmed|verified) (?:lab|database) (?:values?|facts?)\b/i,
  /\bfrom the (?:usda|official nutrition) database\b/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

/**
 * Scan free text / serialized AI output for FR-17 violations.
 */
export function checkAiOutputText(text: string): GuardrailCheck {
  if (!text.trim()) return { ok: true };
  if (matchesAny(text, MEDICAL_PATTERNS)) {
    return { ok: false, reason: "medical_advice" };
  }
  if (matchesAny(text, SHAMING_PATTERNS)) {
    return { ok: false, reason: "shaming" };
  }
  if (matchesAny(text, FALSE_PRECISION_PATTERNS)) {
    return { ok: false, reason: "false_precision" };
  }
  return { ok: true };
}

const USER_FACING_KEYS = new Set([
  "name",
  "tip",
  "message",
  "note",
  "label",
  "title",
  "description",
  "echo",
  "text",
  "reason",
]);

/**
 * Collect short string leaves that may be shown to users (names, tips, etc.).
 */
export function collectUserFacingStrings(value: unknown, depth = 0): string[] {
  if (depth > 8 || value == null) return [];
  if (typeof value === "string") {
    return value.length > 0 && value.length < 500 ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((v) => collectUserFacingStrings(v, depth + 1));
  }
  if (typeof value === "object") {
    const out: string[] = [];
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (USER_FACING_KEYS.has(key) && typeof child === "string") {
        out.push(child);
      } else {
        out.push(...collectUserFacingStrings(child, depth + 1));
      }
    }
    return out;
  }
  return [];
}

/**
 * Full guardrail check: raw model text + user-facing structured fields.
 */
export function checkAiOutput(
  rawText: string,
  data?: unknown,
): GuardrailCheck {
  const rawCheck = checkAiOutputText(rawText);
  if (!rawCheck.ok) return rawCheck;
  if (data === undefined) return { ok: true };
  for (const s of collectUserFacingStrings(data)) {
    const fieldCheck = checkAiOutputText(s);
    if (!fieldCheck.ok) return fieldCheck;
  }
  return { ok: true };
}
