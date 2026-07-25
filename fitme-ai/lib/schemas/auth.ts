import { z } from "zod";

/**
 * Registration input (Story 1.2 / FR-1). Field messages are supportive UX copy.
 */
export const registerSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Sign-in input (Story 1.3 / FR-1).
 */
export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z.string().min(1, "Enter your password."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset link is invalid."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
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
  password: z.string().min(1, "Enter your password to confirm deletion."),
  confirmText: z.literal("DELETE", {
    error: 'Type DELETE (all caps) to confirm.',
  }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
