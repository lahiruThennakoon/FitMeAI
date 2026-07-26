"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { resetPasswordAction } from "@/app/actions/auth";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const errorParam = searchParams.get("error");

  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    token?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(
    errorParam === "INVALID_TOKEN"
      ? "This reset link is invalid or has expired. Request a new one."
      : null,
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      try {
        const result = await resetPasswordAction({ token, password });
        if (result.ok) {
          router.push(result.data.redirectTo);
          router.refresh();
          return;
        }
        setFormError(result.error);
        setFieldErrors({
          password: result.fieldErrors?.password,
          token: result.fieldErrors?.token,
        });
      } catch {
        setFormError("Something went wrong. Please try again.");
      }
    });
  }

  if (!token && !errorParam) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-600" role="alert">
          This reset link is invalid or has expired. Request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="brand-gradient inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-base font-medium text-white"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
        >
          New password
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
          className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base outline-none ring-brand-blue/30 focus-visible:ring-2 dark:border-neutral-700 dark:bg-neutral-950"
        />
        {fieldErrors.password ? (
          <p id="password-error" role="alert" className="text-sm text-red-600">
            {fieldErrors.password}
          </p>
        ) : (
          <p id="password-hint" className="text-sm text-neutral-500">
            Use at least 8 characters.
          </p>
        )}
      </div>

      {formError && !fieldErrors.password ? (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !token}
        className="brand-gradient inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-base font-medium text-white shadow-md shadow-brand-blue/25 transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Updating password…" : "Update password"}
      </button>
    </form>
  );
}
