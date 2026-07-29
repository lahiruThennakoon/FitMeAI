"use client";

import { useState, useTransition } from "react";
import { changePasswordAction } from "@/app/actions/auth";

const inputClass =
  "h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base outline-none ring-brand-blue/30 focus-visible:ring-2 dark:border-neutral-700 dark:bg-neutral-950";

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
      <div className="space-y-2">
        <label
          htmlFor="current-password"
          className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
        >
          Current password
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          aria-invalid={Boolean(fieldErrors.currentPassword)}
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="new-password"
          className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
        >
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          aria-invalid={Boolean(fieldErrors.newPassword)}
          aria-describedby={
            fieldErrors.newPassword ? "new-password-error" : "new-password-hint"
          }
          className={inputClass}
        />
        {fieldErrors.newPassword ? (
          <p id="new-password-error" role="alert" className="text-sm text-red-600">
            {fieldErrors.newPassword}
          </p>
        ) : (
          <p id="new-password-hint" className="text-sm text-neutral-500">
            At least 8 characters. Your other devices will be signed out.
          </p>
        )}
      </div>

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

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-blue px-6 text-base font-medium text-white shadow-sm transition hover:bg-brand-blue/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Changing password…" : "Change password"}
      </button>
    </form>
  );
}
