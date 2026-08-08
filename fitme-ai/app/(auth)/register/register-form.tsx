"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { registerAction } from "@/app/actions/auth";
import { AppButton, AppLinkButton } from "@/components/app-button";
import { PasswordField } from "@/components/password-field";
import { clientFieldErrors } from "@/lib/auth/client-validation";
import { validateEmail } from "@/lib/domain/auth/email";
import {
  PASSWORD_MAX_MESSAGE,
  PASSWORD_MIN_MESSAGE,
  registerSchema,
} from "@/lib/schemas/auth";

type FieldErrors = Partial<Record<"email" | "password", string>>;

function validateRegisterPassword(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return PASSWORD_MIN_MESSAGE;
  if (trimmed.length < 8) return PASSWORD_MIN_MESSAGE;
  if (trimmed.length > 128) return PASSWORD_MAX_MESSAGE;
  return undefined;
}

export function RegisterForm() {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const clientErrors = clientFieldErrors(registerSchema, { email, password });
    if (clientErrors) {
      setFieldErrors(clientErrors);
      return;
    }

    startTransition(async () => {
      try {
        const result = await registerAction({ email, password });
        if (result.ok) {
          setSuccessMessage(result.data.message);
          return;
        }
        setFormError(result.error);
        setFieldErrors({
          email: result.fieldErrors?.email,
          password: result.fieldErrors?.password,
        });
      } catch {
        setFormError("Something went wrong. Please try again.");
      }
    });
  }

  if (successMessage) {
    return (
      <div
        className="space-y-4 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          {successMessage}
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Check your email to verify your account, then sign in.
        </p>
        <AppLinkButton href="/login" block>
          Continue to sign in
        </AppLinkButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) {
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }
          }}
          onBlur={() => {
            const result = validateEmail(email);
            if (!result.ok) {
              setFieldErrors((prev) => ({ ...prev, email: result.message }));
            }
          }}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 outline-none ring-brand-blue/30 focus-visible:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
        {fieldErrors.email ? (
          <p id="email-error" role="alert" className="text-sm text-red-600">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <PasswordField
        id="password"
        name="password"
        label="Password"
        autoComplete="new-password"
        value={password}
        onChange={(next) => {
          setPassword(next);
          if (fieldErrors.password) {
            setFieldErrors((prev) => ({ ...prev, password: undefined }));
          }
        }}
        onBlur={() => {
          const message = validateRegisterPassword(password);
          if (message) {
            setFieldErrors((prev) => ({ ...prev, password: message }));
          }
        }}
        aria-invalid={Boolean(fieldErrors.password)}
        aria-describedby={
          fieldErrors.password ? "password-error" : "password-hint"
        }
        error={
          fieldErrors.password ? (
            <p id="password-error" role="alert" className="text-sm text-red-600">
              {fieldErrors.password}
            </p>
          ) : undefined
        }
        hint={
          !fieldErrors.password ? (
            <p id="password-hint" className="text-sm text-neutral-500">
              At least 8 characters.
            </p>
          ) : undefined
        }
      />

      {formError && !fieldErrors.email && !fieldErrors.password ? (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      ) : null}

      <AppButton type="submit" disabled={pending} block>
        {pending ? "Creating account…" : "Create account"}
      </AppButton>

      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-blue underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
