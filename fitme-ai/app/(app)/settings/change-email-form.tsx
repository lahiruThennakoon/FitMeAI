"use client";

import { useState, useTransition } from "react";
import { changeEmailAction } from "@/app/actions/auth";

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [pending, startTransition] = useTransition();
  const [newEmail, setNewEmail] = useState("");
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
        const result = await changeEmailAction({ newEmail });
        if (!result.ok) {
          setFormError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
          return;
        }
        setMessage(result.data.message);
        setNewEmail("");
      } catch {
        setFormError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label
          htmlFor="new-email"
          className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
        >
          New email address
        </label>
        <input
          id="new-email"
          type="email"
          autoComplete="email"
          required
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          aria-invalid={Boolean(fieldErrors.newEmail)}
          aria-describedby={
            fieldErrors.newEmail ? "new-email-error" : "new-email-hint"
          }
          className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base outline-none ring-brand-blue/30 focus-visible:ring-2 dark:border-neutral-700 dark:bg-neutral-950"
        />
        {fieldErrors.newEmail ? (
          <p id="new-email-error" role="alert" className="text-sm text-red-600">
            {fieldErrors.newEmail}
          </p>
        ) : (
          <p id="new-email-hint" className="text-sm text-neutral-500">
            We&apos;ll email {currentEmail} to confirm. Nothing changes until you
            click that link.
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
        className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-brand-blue px-6 text-base font-medium text-brand-blue transition hover:bg-brand-blue/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sending confirmation…" : "Change email"}
      </button>
    </form>
  );
}
