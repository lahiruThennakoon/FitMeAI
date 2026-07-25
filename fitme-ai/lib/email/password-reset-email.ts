import "server-only";
import { sendEmail } from "@/lib/email/send-email";

export function buildPasswordResetEmailContent(url: string) {
  return {
    subject: "Reset your FitMe AI password",
    text: `Click the link to reset your password: ${url}`,
    html: `<p>We received a request to reset your FitMe AI password.</p><p><a href="${url}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  };
}

export async function deliverPasswordResetEmail(args: {
  to: string;
  url: string;
  userId: string;
}): Promise<void> {
  const content = buildPasswordResetEmailContent(args.url);
  await sendEmail({
    to: args.to,
    ...content,
    userId: args.userId,
    verificationUrl: args.url,
  });
}
