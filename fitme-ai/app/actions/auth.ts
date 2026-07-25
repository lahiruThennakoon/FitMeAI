"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  DELETE_ACCOUNT_GENERIC_ERROR,
  RATE_LIMIT_ERROR,
  REGISTER_GENERIC_ERROR,
  REGISTER_SUCCESS_MESSAGE,
  REQUEST_RESET_SUCCESS_MESSAGE,
  RESET_PASSWORD_GENERIC_ERROR,
  fieldErrorsFromZod,
  mapLoginError,
  nameFromEmail,
  type AuthClientKeyFn,
  type AuthRateLimitFn,
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
  type AuthRateLimitBucket,
} from "@/lib/rate-limit";
import { clientKeyFromHeaders } from "@/lib/rate-limit/client-key";
import { err, ok } from "@/lib/result";
import {
  deleteAccountSchema,
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/lib/schemas/auth";

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
      return { ok: false, error: RATE_LIMIT_ERROR };
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
