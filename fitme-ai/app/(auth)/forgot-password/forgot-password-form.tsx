"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { AppButton, AppLinkButton } from "@/components/app-button";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    setFormError(null);

    startTransition(async () => {
      try {
        const result = await requestPasswordResetAction({ email });
        if (result.ok) {
          setSuccessMessage(result.data.message);
          return;
        }
        setFormError(result.error);
        setFieldError(result.fieldErrors?.email ?? null);
      } catch {
        setFormError("Something went wrong. Please try again.");
      }
    });
  }

  if (successMessage) {
    return (
      <div className="space-y-4 text-center" role="status" aria-live="polite">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          {successMessage}
        </p>
        <AppLinkButton href="/login" block>
          Back to sign in
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
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? "email-error" : undefined}
          className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 outline-none ring-brand-blue/30 focus-visible:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
        {fieldError ? (
          <p id="email-error" role="alert" className="text-sm text-red-600">
            {fieldError}
          </p>
        ) : null}
      </div>

      {formError && !fieldError ? (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      ) : null}

      <AppButton type="submit" disabled={pending} block>
        {pending ? "Sending link…" : "Send reset link"}
      </AppButton>

      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-blue underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
