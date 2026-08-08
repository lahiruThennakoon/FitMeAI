"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { resetPasswordAction } from "@/app/actions/auth";
import { AppButton, AppLinkButton } from "@/components/app-button";
import { PasswordField } from "@/components/password-field";

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
        <AppLinkButton href="/forgot-password" block>
          Request a new link
        </AppLinkButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <PasswordField
        id="password"
        name="password"
        label="New password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={setPassword}
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
              Use at least 8 characters.
            </p>
          ) : undefined
        }
      />

      {formError && !fieldErrors.password ? (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      ) : null}

      <AppButton type="submit" disabled={pending || !token} block>
        {pending ? "Updating password…" : "Update password"}
      </AppButton>
    </form>
  );
}
