import { z } from "zod";

/**
 * Server environment contract. Fails fast with a clear, non-secret message
 * when a required variable is missing (Story 1.1 AC). Values are never logged.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(16, "BETTER_AUTH_SECRET must be at least 16 characters"),
  BETTER_AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  // Optional mail (Story 1.2). Console/dev adapter used when RESEND_API_KEY is unset.
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  // Optional AI (Story 2.2 / AD-4). Gemini adapter returns not_configured without key.
  GEMINI_API_KEY: z.string().min(1).optional(),
  AI_PROVIDER: z.enum(["gemini", "fake"]).optional(),
  AI_MODEL: z.string().min(1).optional(),
  AI_TIMEOUT_MS: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Parse and validate server env. Throws with the list of *names* (never values)
 * that failed, so misconfiguration surfaces immediately and safely.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid or missing environment variables: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}

/**
 * Non-throwing check used by diagnostics (e.g. the health route). Returns only
 * booleans about presence/validity — never the secret values themselves.
 */
export function serverEnvStatus(): { ok: boolean; missing: string[] } {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (parsed.success) return { ok: true, missing: [] };
  return {
    ok: false,
    missing: parsed.error.issues.map((i) => i.path.join(".")),
  };
}
