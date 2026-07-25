import "server-only";
import { sendEmail } from "@/lib/email/send-email";

export function buildVerificationEmailContent(url: string) {
  return {
    subject: "Verify your FitMe AI email",
    text: `Click the link to verify your email: ${url}`,
    html: `<p>Welcome to FitMe AI.</p><p><a href="${url}">Verify your email</a></p><p>If you did not create an account, you can ignore this message.</p>`,
  };
}

export async function deliverVerificationEmail(args: {
  to: string;
  url: string;
  userId: string;
}): Promise<void> {
  const content = buildVerificationEmailContent(args.url);
  await sendEmail({
    to: args.to,
    ...content,
    userId: args.userId,
    verificationUrl: args.url,
  });
}
