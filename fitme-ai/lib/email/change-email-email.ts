import "server-only";
import { sendEmail } from "@/lib/email/send-email";

export function buildChangeEmailContent(url: string, newEmail: string) {
  return {
    subject: "Approve your FitMe AI email change",
    text: `Someone asked to move this FitMe AI account to ${newEmail}. If that was you, approve it here: ${url}. If it wasn't, ignore this message and your address stays as it is.`,
    html: `<p>Someone asked to move this FitMe AI account to <strong>${newEmail}</strong>.</p><p><a href="${url}">Approve the change</a></p><p>If that wasn't you, ignore this message — your address stays as it is.</p>`,
  };
}

/**
 * Approval goes to the address currently on the account, not the new one, so
 * an attacker holding a session can't move the account somewhere the owner
 * can't reach.
 */
export async function deliverChangeEmailVerification(args: {
  to: string;
  newEmail: string;
  url: string;
  userId: string;
}): Promise<void> {
  const content = buildChangeEmailContent(args.url, args.newEmail);
  await sendEmail({
    to: args.to,
    ...content,
    userId: args.userId,
    verificationUrl: args.url,
  });
}
