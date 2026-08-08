"use client";

import { useId, useState } from "react";

export const PASSWORD_INPUT_CLASS =
  "h-12 w-full rounded-xl border border-neutral-300 bg-white py-0 pl-4 pr-11 text-base text-neutral-900 outline-none ring-brand-blue/30 focus-visible:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100";

type PasswordFieldProps = {
  id?: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  className?: string;
  error?: React.ReactNode;
  hint?: React.ReactNode;
};

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M2.25 12s3.75-7.5 9.75-7.5S21.75 12 21.75 12s-3.75 7.5-9.75 7.5S2.25 12 2.25 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M3 3l18 18M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42M9.88 5.09A10.72 10.72 0 0 1 12 4.5c6 0 9.75 7.5 9.75 7.5a17.5 17.5 0 0 1-4.06 5.06M6.06 6.06A17.4 17.4 0 0 0 2.25 12s3.75 7.5 9.75 7.5c1.07 0 2.08-.18 3-.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  autoComplete,
  required,
  minLength,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  className = PASSWORD_INPUT_CLASS,
  error,
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          className={className}
        />
        <button
          type="button"
          onClick={() => setVisible((show) => !show)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xl text-neutral-500 transition hover:text-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-blue dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error ? error : hint}
    </div>
  );
}
