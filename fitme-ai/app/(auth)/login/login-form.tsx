"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loginAction } from "@/app/actions/auth";
import { AppButton } from "@/components/app-button";
import { PasswordField } from "@/components/password-field";
import { clientFieldErrors } from "@/lib/auth/client-validation";
import { validateEmail } from "@/lib/domain/auth/email";
import {
  loginSchema,
  PASSWORD_MAX_MESSAGE,
  PASSWORD_REQUIRED_MESSAGE,
} from "@/lib/schemas/auth";

type FieldErrors = Partial<Record<"email" | "password", string>>;

function validateLoginPassword(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return PASSWORD_REQUIRED_MESSAGE;
  if (trimmed.length > 128) return PASSWORD_MAX_MESSAGE;
  return undefined;
}

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const clientErrors = clientFieldErrors(loginSchema, { email, password });
    if (clientErrors) {
      setFieldErrors(clientErrors);
      return;
    }

    startTransition(async () => {
      try {
        const result = await loginAction({ email, password });
        if (result.ok) {
          router.push(result.data.redirectTo);
          router.refresh();
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
        autoComplete="current-password"
        value={password}
        onChange={(next) => {
          setPassword(next);
          if (fieldErrors.password) {
            setFieldErrors((prev) => ({ ...prev, password: undefined }));
          }
        }}
        onBlur={() => {
          const message = validateLoginPassword(password);
          if (message) {
            setFieldErrors((prev) => ({ ...prev, password: message }));
          }
        }}
        aria-invalid={Boolean(fieldErrors.password)}
        aria-describedby={fieldErrors.password ? "password-error" : undefined}
        error={
          fieldErrors.password ? (
            <p id="password-error" role="alert" className="text-sm text-red-600">
              {fieldErrors.password}
            </p>
          ) : undefined
        }
      />

      {formError && !fieldErrors.email && !fieldErrors.password ? (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      ) : null}

      <p className="text-right text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-brand-blue underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          Forgot password?
        </Link>
      </p>

      <AppButton type="submit" disabled={pending} block>
        {pending ? "Signing in…" : "Sign in"}
      </AppButton>

      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        New here?{" "}
        <Link
          href="/register"
          className="font-medium text-brand-blue underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
