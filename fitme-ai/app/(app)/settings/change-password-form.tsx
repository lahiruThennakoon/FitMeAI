"use client";

import { useState, useTransition } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import { AppButton } from "@/components/app-button";
import {
  PASSWORD_INPUT_CLASS,
  PasswordField,
} from "@/components/password-field";

const inputClass = PASSWORD_INPUT_CLASS;

export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await changePasswordAction({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        });
        if (!result.ok) {
          setFormError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
          return;
        }
        setMessage(result.data.message);
        setCurrentPassword("");
        setNewPassword("");
      } catch {
        setFormError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <PasswordField
        id="current-password"
        label="Current password"
        autoComplete="current-password"
        required
        value={currentPassword}
        onChange={setCurrentPassword}
        aria-invalid={Boolean(fieldErrors.currentPassword)}
        className={inputClass}
      />

      <PasswordField
        id="new-password"
        label="New password"
        autoComplete="new-password"
        required
        value={newPassword}
        onChange={setNewPassword}
        aria-invalid={Boolean(fieldErrors.newPassword)}
        aria-describedby={
          fieldErrors.newPassword ? "new-password-error" : "new-password-hint"
        }
        className={inputClass}
        error={
          fieldErrors.newPassword ? (
            <p id="new-password-error" role="alert" className="text-sm text-red-600">
              {fieldErrors.newPassword}
            </p>
          ) : undefined
        }
        hint={
          !fieldErrors.newPassword ? (
            <p id="new-password-hint" className="text-sm text-neutral-500">
              At least 8 characters. Your other devices will be signed out.
            </p>
          ) : undefined
        }
      />

      {formError ? (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-brand-green">
          {message}
        </p>
      ) : null}

      <AppButton type="submit" disabled={pending} variant="solid-blue" block>
        {pending ? "Changing password…" : "Change password"}
      </AppButton>
    </form>
  );
}
