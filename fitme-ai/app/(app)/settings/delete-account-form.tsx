"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/actions/auth";
import { AppButton } from "@/components/app-button";
import { PasswordField } from "@/components/password-field";

export function DeleteAccountForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmText?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      try {
        const result = await deleteAccountAction({ password, confirmText });
        if (result.ok) {
          router.push(result.data.redirectTo);
          router.refresh();
          return;
        }
        setFormError(result.error);
        setFieldErrors({
          password: result.fieldErrors?.password,
          confirmText: result.fieldErrors?.confirmText,
        });
      } catch {
        setFormError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        This permanently removes your account and signs you out everywhere.
        Health data you add in later features will be hard-deleted with your
        account. This cannot be undone.
      </p>

      <PasswordField
        id="delete-password"
        name="password"
        label="Current password"
        autoComplete="current-password"
        required
        value={password}
        onChange={setPassword}
        aria-invalid={Boolean(fieldErrors.password)}
        aria-describedby={
          fieldErrors.password ? "delete-password-error" : undefined
        }
        error={
          fieldErrors.password ? (
            <p
              id="delete-password-error"
              role="alert"
              className="text-sm text-red-600"
            >
              {fieldErrors.password}
            </p>
          ) : undefined
        }
      />

      <div className="space-y-2">
        <label
          htmlFor="confirm-text"
          className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
        >
          Type DELETE to confirm
        </label>
        <input
          id="confirm-text"
          name="confirmText"
          type="text"
          autoComplete="off"
          required
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          aria-invalid={Boolean(fieldErrors.confirmText)}
          aria-describedby={
            fieldErrors.confirmText ? "confirm-text-error" : "confirm-text-hint"
          }
          className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base outline-none ring-brand-blue/30 focus-visible:ring-2 dark:border-neutral-700 dark:bg-neutral-950"
        />
        {fieldErrors.confirmText ? (
          <p id="confirm-text-error" role="alert" className="text-sm text-red-600">
            {fieldErrors.confirmText}
          </p>
        ) : (
          <p id="confirm-text-hint" className="text-sm text-neutral-500">
            Must match exactly: DELETE
          </p>
        )}
      </div>

      {formError && !fieldErrors.password && !fieldErrors.confirmText ? (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      ) : null}

      <AppButton type="submit" disabled={pending} variant="danger" block>
        {pending ? "Deleting account…" : "Delete my account permanently"}
      </AppButton>
    </form>
  );
}
