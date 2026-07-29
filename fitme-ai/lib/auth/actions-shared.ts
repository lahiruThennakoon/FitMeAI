import type { ZodError } from "zod";
import type { FieldErrors, Result } from "@/lib/result";
import type { AuthRateLimitBucket } from "@/lib/rate-limit/config";
import { RATE_LIMIT_ERROR } from "@/lib/rate-limit/config";
import type { RateLimitResult } from "@/lib/rate-limit/check";

export const REGISTER_SUCCESS_MESSAGE =
  "Account created. Check your email for a verification link.";

export const REGISTER_GENERIC_ERROR =
  "Something went wrong. Please try again.";

export const LOGIN_GENERIC_ERROR =
  "Email or password is incorrect.";

export const LOGIN_UNVERIFIED_MESSAGE =
  "Please verify your email before signing in.";

export const REQUEST_RESET_SUCCESS_MESSAGE =
  "If this email exists in our system, check your inbox for a reset link.";

export const RESET_PASSWORD_GENERIC_ERROR =
  "This reset link is invalid or has expired. Request a new one.";

export const DELETE_ACCOUNT_GENERIC_ERROR =
  "Could not delete your account. Check your password and try again.";

export { RATE_LIMIT_ERROR };

/** Optional override for Story 1.8 rate limiting (inject in tests). */
export type AuthRateLimitFn = (
  bucket: AuthRateLimitBucket,
  clientKey: string,
) => RateLimitResult;

export type AuthClientKeyFn = () => Promise<string>;

export type RegisterActionResult = Result<{ message: string }>;
export type LoginActionResult = Result<{ redirectTo: string }>;
export type RequestPasswordResetResult = Result<{ message: string }>;
export type ResetPasswordResult = Result<{ redirectTo: string }>;
export type DeleteAccountResult = Result<{ redirectTo: string }>;

type SignUpEmail = (args: {
  body: {
    email: string;
    password: string;
    name: string;
    callbackURL?: string;
  };
}) => Promise<unknown>;

type SendVerificationEmail = (args: {
  body: {
    email: string;
    callbackURL?: string;
  };
}) => Promise<unknown>;

type SignInEmail = (args: {
  body: {
    email: string;
    password: string;
    callbackURL?: string;
    rememberMe?: boolean;
  };
  headers: Headers;
}) => Promise<unknown>;

export type RegisterActionDeps = {
  signUpEmail?: SignUpEmail;
  sendVerificationEmail?: SendVerificationEmail;
  getClientKey?: AuthClientKeyFn;
  rateLimit?: AuthRateLimitFn;
};

export type LoginActionDeps = {
  signInEmail?: SignInEmail;
  getHeaders?: () => Promise<Headers>;
  getClientKey?: AuthClientKeyFn;
  rateLimit?: AuthRateLimitFn;
};

type RequestPasswordReset = (args: {
  body: {
    email: string;
    redirectTo?: string;
  };
}) => Promise<unknown>;

type ResetPassword = (args: {
  body: {
    newPassword: string;
    token?: string;
  };
}) => Promise<unknown>;

export type RequestPasswordResetDeps = {
  requestPasswordReset?: RequestPasswordReset;
  getClientKey?: AuthClientKeyFn;
  rateLimit?: AuthRateLimitFn;
};

export type ResetPasswordDeps = {
  resetPassword?: ResetPassword;
  getClientKey?: AuthClientKeyFn;
  rateLimit?: AuthRateLimitFn;
};

type DeleteUser = (args: {
  body: {
    password?: string;
    callbackURL?: string;
  };
  headers: Headers;
}) => Promise<unknown>;

export type DeleteAccountDeps = {
  deleteUser?: DeleteUser;
  getHeaders?: () => Promise<Headers>;
  getClientKey?: AuthClientKeyFn;
  rateLimit?: AuthRateLimitFn;
};

export const CHANGE_PASSWORD_GENERIC_ERROR =
  "Could not change your password. Check your current password and try again.";

export const CHANGE_PASSWORD_SUCCESS_MESSAGE =
  "Password changed. Other devices have been signed out.";

export const CHANGE_EMAIL_GENERIC_ERROR =
  "Could not start the email change. Please try again.";

export const CHANGE_EMAIL_SAME_ADDRESS_ERROR =
  "That's already your email address.";

/** Neutral either way — never reveals whether the new address is already taken. */
export function changeEmailPendingMessage(currentEmail: string): string {
  return `Check ${currentEmail} for a link to approve the change. Your address stays the same until you do.`;
}

type ChangePassword = (args: {
  body: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions?: boolean;
  };
  headers: Headers;
}) => Promise<unknown>;

type ChangeEmail = (args: {
  body: {
    newEmail: string;
    callbackURL?: string;
  };
  headers: Headers;
}) => Promise<unknown>;

export type ChangePasswordDeps = {
  changePassword?: ChangePassword;
  getHeaders?: () => Promise<Headers>;
  getClientKey?: AuthClientKeyFn;
  rateLimit?: AuthRateLimitFn;
};

export type ChangeEmailDeps = {
  changeEmail?: ChangeEmail;
  getHeaders?: () => Promise<Headers>;
  getSession?: () => Promise<{ id: string; email: string } | null>;
  getClientKey?: AuthClientKeyFn;
  rateLimit?: AuthRateLimitFn;
};

export type ChangePasswordResult = Result<{ message: string }>;
export type ChangeEmailResult = Result<{ message: string }>;

/** Derive Better Auth `name` without collecting a separate Name field. */
export function nameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim();
  return local && local.length > 0 ? local : "user";
}

export function fieldErrorsFromZod(error: ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/**
 * Guard for AC #1: stored credential must be present, non-trivial, and not the
 * plaintext password. Better Auth performs hashing; this asserts the invariant.
 */
export function assertStoredPasswordIsHashed(
  stored: string | null | undefined,
  plaintext: string,
): boolean {
  return (
    typeof stored === "string" &&
    stored.length >= 20 &&
    stored !== plaintext
  );
}

export function mapLoginError(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const code =
      "code" in error && typeof error.code === "string" ? error.code : undefined;
    if (code === "EMAIL_NOT_VERIFIED") {
      return LOGIN_UNVERIFIED_MESSAGE;
    }
  }
  return LOGIN_GENERIC_ERROR;
}
