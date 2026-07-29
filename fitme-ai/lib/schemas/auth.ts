import { z } from "zod";
import { validateEmail, normalizeEmail } from "@/lib/domain/auth/email";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_REQUIRED_MESSAGE = "Enter your password.";
export const PASSWORD_MIN_MESSAGE = "Use at least 8 characters.";
export const PASSWORD_MAX_MESSAGE = "Password must be at most 128 characters.";

const emailField = z
  .string()
  .superRefine((raw, ctx) => {
    const result = validateEmail(raw);
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: result.message });
    }
  })
  .transform((raw) => normalizeEmail(raw));

const registerPasswordField = z
  .string()
  .trim()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_MIN_MESSAGE)
  .max(PASSWORD_MAX_LENGTH, PASSWORD_MAX_MESSAGE);

const loginPasswordField = z
  .string()
  .trim()
  .min(1, PASSWORD_REQUIRED_MESSAGE)
  .max(PASSWORD_MAX_LENGTH, PASSWORD_MAX_MESSAGE);

/**
 * Registration input (Story 1.2 / FR-1). Field messages are supportive UX copy.
 */
export const registerSchema = z.object({
  email: emailField,
  password: registerPasswordField,
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Sign-in input (Story 1.3 / FR-1).
 */
export const loginSchema = z.object({
  email: emailField,
  password: loginPasswordField,
});

export type LoginInput = z.infer<typeof loginSchema>;

export const requestPasswordResetSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Reset link is invalid."),
  password: registerPasswordField,
});

export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Account deletion consent (Story 1.5 / FR-3).
 * User must re-enter password and type DELETE to confirm.
 */
export const deleteAccountSchema = z.object({
  password: z
    .string()
    .trim()
    .min(1, "Enter your password to confirm deletion."),
  confirmText: z.literal("DELETE", {
    error: "Type DELETE (all caps) to confirm.",
  }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/**
 * Change password while signed in. Requires the current password so a stolen
 * session can't lock the owner out, and refuses a no-op change.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .trim()
      .min(1, "Enter your current password."),
    newPassword: registerPasswordField,
    revokeOtherSessions: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Choose a password different from your current one.",
      });
    }
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Change the account email. Approval is emailed to the current address. */
export const changeEmailSchema = z.object({
  newEmail: emailField,
});

export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
