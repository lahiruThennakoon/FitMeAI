import "server-only";
import { logger } from "@/lib/logging";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Optional correlation id for redacted logs — never log `to`. */
  userId?: string;
  /** Full verification URL from Better Auth; only a token-stripped path is logged. */
  verificationUrl?: string;
};

export const RESEND_FETCH_TIMEOUT_MS = 10_000;

/** Dev console adapter; production requires Resend (Decision A). */
export function isProductionMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/**
 * Strip secret token query params so console/dev logs never contain the raw token.
 */
export function verificationPathForLog(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("token");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/api/auth/verify-email";
  }
}

/**
 * Mail port (Story 1.2). Resend via fetch when RESEND_API_KEY is set; otherwise
 * a console/dev adapter that never logs email, password, or raw tokens.
 * Throws on delivery failure (Decision A).
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM ?? "FitMe AI <onboarding@resend.dev>";

  if (process.env.NODE_ENV === "production" && !apiKey) {
    logger.error("email.send.not_configured", { event: "email_not_configured" });
    throw new Error("Mail delivery is not configured");
  }

  if (apiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      RESEND_FETCH_TIMEOUT_MS,
    );

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        logger.error("email.send.failed", {
          event: "email_send_failed",
          userId: input.userId,
        });
        throw new Error("Failed to send email");
      }

      logger.info("email.send.ok", {
        event: "email_sent",
        userId: input.userId,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.error("email.send.timeout", {
          event: "email_send_timeout",
          userId: input.userId,
        });
        throw new Error("Email delivery timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    return;
  }

  const path = input.verificationUrl
    ? verificationPathForLog(input.verificationUrl)
    : undefined;

  // Structured log stays redacted (AD-9). In local/dev without Resend, also
  // print the full clickable URL to the terminal so signup can be completed.
  logger.info("email.verification.dev", {
    event: "verification_email",
    userId: input.userId,
    ...(path ? { path } : {}),
  });

  if (input.verificationUrl) {
    console.info(
      `\n[FitMe AI] Dev mail (no RESEND_API_KEY) — open this link to verify:\n${input.verificationUrl}\n`,
    );
  } else {
    console.info(
      `\n[FitMe AI] Dev mail (no RESEND_API_KEY) — subject: ${input.subject}\n${input.text}\n`,
    );
  }
}
