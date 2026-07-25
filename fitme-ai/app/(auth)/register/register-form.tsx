"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { registerAction } from "@/app/actions/auth";

type FieldErrors = Partial<Record<"email" | "password", string>>;

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
        <Link
          href="/login"
          className="brand-gradient inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-base font-medium text-white shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          Continue to sign in
        </Link>
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
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={
            fieldErrors.password ? "password-error" : "password-hint"
          }
          className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 outline-none ring-brand-blue/30 focus-visible:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
        {fieldErrors.password ? (
          <p id="password-error" role="alert" className="text-sm text-red-600">
            {fieldErrors.password}
          </p>
        ) : (
          <p
            id="password-hint"
            className="text-sm text-neutral-500 dark:text-neutral-400"
          >
            Use at least 8 characters.
          </p>
        )}
      </div>

      {formError && !fieldErrors.email && !fieldErrors.password ? (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="brand-gradient inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-base font-medium text-white shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

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
