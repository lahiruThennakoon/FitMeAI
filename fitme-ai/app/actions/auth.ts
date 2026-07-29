"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  CHANGE_EMAIL_GENERIC_ERROR,
  CHANGE_EMAIL_SAME_ADDRESS_ERROR,
  CHANGE_PASSWORD_GENERIC_ERROR,
  CHANGE_PASSWORD_SUCCESS_MESSAGE,
  DELETE_ACCOUNT_GENERIC_ERROR,
  RATE_LIMIT_ERROR,
  REGISTER_GENERIC_ERROR,
  REGISTER_SUCCESS_MESSAGE,
  REQUEST_RESET_SUCCESS_MESSAGE,
  RESET_PASSWORD_GENERIC_ERROR,
  changeEmailPendingMessage,
  fieldErrorsFromZod,
  mapLoginError,
  nameFromEmail,
  type AuthClientKeyFn,
  type AuthRateLimitFn,
  type ChangeEmailDeps,
  type ChangeEmailResult,
  type ChangePasswordDeps,
  type ChangePasswordResult,
  type DeleteAccountDeps,
  type DeleteAccountResult,
  type LoginActionDeps,
  type LoginActionResult,
  type RegisterActionDeps,
  type RegisterActionResult,
  type RequestPasswordResetDeps,
  type RequestPasswordResetResult,
  type ResetPasswordDeps,
  type ResetPasswordResult,
} from "@/lib/auth/actions-shared";
import { logger } from "@/lib/logging";
import {
  enforceAuthRateLimit,
  rateLimitMessage,
  type AuthRateLimitBucket,
} from "@/lib/rate-limit";
import { clientKeyFromHeaders } from "@/lib/rate-limit/client-key";
import { err, ok } from "@/lib/result";
import {
  changeEmailSchema,
  changePasswordSchema,
  deleteAccountSchema,
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/lib/schemas/auth";
import { getSession } from "@/lib/dal";

async function defaultClientKey(): Promise<string> {
  return clientKeyFromHeaders(await headers());
}

function defaultRateLimit(bucket: AuthRateLimitBucket, clientKey: string) {
  return enforceAuthRateLimit({ bucket, clientKey });
}

async function guardAuthRateLimit(opts: {
  bucket: AuthRateLimitBucket;
  getClientKey?: AuthClientKeyFn;
  rateLimit?: AuthRateLimitFn;
  event: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const getClientKey = opts.getClientKey ?? defaultClientKey;
    const rateLimit = opts.rateLimit ?? defaultRateLimit;
    const clientKey = await getClientKey();
    const result = rateLimit(opts.bucket, clientKey);
    if (!result.ok) {
      logger.warn(opts.event, { outcome: "rate_limited" });
      return { ok: false, error: rateLimitMessage(result.retryAfterSec) };
    }
    return { ok: true };
  } catch {
    logger.warn(opts.event, { outcome: "rate_limit_error" });
    return { ok: false, error: RATE_LIMIT_ERROR };
  }
}

export async function registerAction(
  input: unknown,
  deps: RegisterActionDeps = {},
): Promise<RegisterActionResult> {
  const limited = await guardAuthRateLimit({
    bucket: "register",
    getClientKey: deps.getClientKey,
    rateLimit: deps.rateLimit,
    event: "auth.register.rate_limited",
  });
  if (!limited.ok) return err(limited.error);

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Please check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const { email, password } = parsed.data;
  const name = nameFromEmail(email);
  const signUpEmail =
    deps.signUpEmail ?? ((args) => auth.api.signUpEmail(args));
  const sendVerificationEmail =
    deps.sendVerificationEmail ??
    ((args) => auth.api.sendVerificationEmail(args));

  try {
    await signUpEmail({
      body: {
        email,
        password,
        name,
        callbackURL: "/login",
      },
    });
  } catch {
    logger.error("auth.register.failed", { outcome: "signup_error" });
    return err(REGISTER_GENERIC_ERROR);
  }

  try {
    await sendVerificationEmail({
      body: {
        email,
        callbackURL: "/login",
      },
    });
  } catch {
    logger.error("auth.register.failed", { outcome: "verification_error" });
    return err(REGISTER_GENERIC_ERROR);
  }

  logger.info("auth.register.completed", { outcome: "accepted" });
  return ok({ message: REGISTER_SUCCESS_MESSAGE });
}

export async function loginAction(
  input: unknown,
  deps: LoginActionDeps = {},
): Promise<LoginActionResult> {
  const limited = await guardAuthRateLimit({
    bucket: "login",
    getClientKey: deps.getClientKey,
    rateLimit: deps.rateLimit,
    event: "auth.login.rate_limited",
  });
  if (!limited.ok) return err(limited.error);

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Please check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const { email, password } = parsed.data;
  const signInEmail =
    deps.signInEmail ?? ((args) => auth.api.signInEmail(args));
  const getHeaders = deps.getHeaders ?? (async () => await headers());

  try {
    await signInEmail({
      body: {
        email,
        password,
        callbackURL: "/dashboard",
        rememberMe: true,
      },
      headers: await getHeaders(),
    });
    logger.info("auth.login.completed", { outcome: "accepted" });
    return ok({ redirectTo: "/dashboard" });
  } catch (error) {
    logger.error("auth.login.failed", { outcome: "rejected" });
    return err(mapLoginError(error));
  }
}

export async function requestPasswordResetAction(
  input: unknown,
  deps: RequestPasswordResetDeps = {},
): Promise<RequestPasswordResetResult> {
  const limited = await guardAuthRateLimit({
    bucket: "passwordResetRequest",
    getClientKey: deps.getClientKey,
    rateLimit: deps.rateLimit,
    event: "auth.password_reset_request.rate_limited",
  });
  if (!limited.ok) return err(limited.error);

  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Please check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const requestPasswordReset =
    deps.requestPasswordReset ??
    ((args) => auth.api.requestPasswordReset(args));

  try {
    await requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: "/reset-password",
      },
    });
  } catch {
    // Always neutral — never reveal whether the email exists or mail failed (enumeration-safe).
    logger.error("auth.password_reset_request.failed", { outcome: "error" });
  }

  logger.info("auth.password_reset_request.completed", { outcome: "accepted" });
  return ok({ message: REQUEST_RESET_SUCCESS_MESSAGE });
}

export async function resetPasswordAction(
  input: unknown,
  deps: ResetPasswordDeps = {},
): Promise<ResetPasswordResult> {
  const limited = await guardAuthRateLimit({
    bucket: "passwordReset",
    getClientKey: deps.getClientKey,
    rateLimit: deps.rateLimit,
    event: "auth.password_reset.rate_limited",
  });
  if (!limited.ok) return err(limited.error);

  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Please check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const resetPassword =
    deps.resetPassword ?? ((args) => auth.api.resetPassword(args));

  try {
    await resetPassword({
      body: {
        newPassword: parsed.data.password,
        token: parsed.data.token,
      },
    });
    logger.info("auth.password_reset.completed", { outcome: "accepted" });
    return ok({ redirectTo: "/login" });
  } catch {
    logger.error("auth.password_reset.failed", { outcome: "rejected" });
    return err(RESET_PASSWORD_GENERIC_ERROR);
  }
}

/**
 * Change password without leaving the app (Tier 3).
 *
 * Reuses the login rate-limit bucket: this endpoint verifies a password, so it
 * is a credential-guessing surface just like sign-in.
 */
export async function changePasswordAction(
  input: unknown,
  deps: ChangePasswordDeps = {},
): Promise<ChangePasswordResult> {
  const limited = await guardAuthRateLimit({
    bucket: "login",
    getClientKey: deps.getClientKey,
    rateLimit: deps.rateLimit,
    event: "auth.password_change.rate_limited",
  });
  if (!limited.ok) return err(limited.error);

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Please check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const changePassword =
    deps.changePassword ?? ((args) => auth.api.changePassword(args));
  const getHeaders = deps.getHeaders ?? (async () => await headers());

  try {
    await changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: parsed.data.revokeOtherSessions,
      },
      headers: await getHeaders(),
    });
    logger.info("auth.password_change.completed", { outcome: "accepted" });
    return ok({ message: CHANGE_PASSWORD_SUCCESS_MESSAGE });
  } catch {
    logger.warn("auth.password_change.failed", { outcome: "rejected" });
    return err(CHANGE_PASSWORD_GENERIC_ERROR, {
      currentPassword: CHANGE_PASSWORD_GENERIC_ERROR,
    });
  }
}

/**
 * Start an email change. Better Auth mails the approval link to the address
 * currently on file, so the response is the same whether or not the new address
 * is already registered.
 */
export async function changeEmailAction(
  input: unknown,
  deps: ChangeEmailDeps = {},
): Promise<ChangeEmailResult> {
  const limited = await guardAuthRateLimit({
    bucket: "passwordResetRequest",
    getClientKey: deps.getClientKey,
    rateLimit: deps.rateLimit,
    event: "auth.email_change.rate_limited",
  });
  if (!limited.ok) return err(limited.error);

  const parsed = changeEmailSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Please check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const readSession = deps.getSession ?? getSession;
  const session = await readSession();
  if (!session) return err("Please sign in to change your email.");

  if (session.email.toLowerCase() === parsed.data.newEmail.toLowerCase()) {
    return err(CHANGE_EMAIL_SAME_ADDRESS_ERROR, {
      newEmail: CHANGE_EMAIL_SAME_ADDRESS_ERROR,
    });
  }

  const changeEmail = deps.changeEmail ?? ((args) => auth.api.changeEmail(args));
  const getHeaders = deps.getHeaders ?? (async () => await headers());

  try {
    await changeEmail({
      body: { newEmail: parsed.data.newEmail, callbackURL: "/settings" },
      headers: await getHeaders(),
    });
  } catch {
    // Stay neutral: a "taken" address must look like a success (enumeration-safe).
    logger.warn("auth.email_change.failed", { outcome: "error" });
  }

  logger.info("auth.email_change.requested", { outcome: "accepted" });
  return ok({ message: changeEmailPendingMessage(session.email) });
}

export async function deleteAccountAction(
  input: unknown,
  deps: DeleteAccountDeps = {},
): Promise<DeleteAccountResult> {
  const limited = await guardAuthRateLimit({
    bucket: "login",
    getClientKey: deps.getClientKey,
    rateLimit: deps.rateLimit,
    event: "auth.account.delete_rate_limited",
  });
  if (!limited.ok) return err(limited.error);

  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      "Please check the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const deleteUser =
    deps.deleteUser ?? ((args) => auth.api.deleteUser(args));
  const getHeaders = deps.getHeaders ?? (async () => await headers());

  try {
    await deleteUser({
      body: {
        password: parsed.data.password,
        callbackURL: "/",
      },
      headers: await getHeaders(),
    });
    logger.info("auth.account.delete_requested", { outcome: "accepted" });
    return ok({ redirectTo: "/" });
  } catch {
    logger.error("auth.account.delete_failed", { outcome: "rejected" });
    return err(DELETE_ACCOUNT_GENERIC_ERROR);
  }
}
