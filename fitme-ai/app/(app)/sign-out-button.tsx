"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/lib/auth-client";

type Props = {
  /** Default: bordered button. `link` = quiet text action for footers. */
  variant?: "button" | "link";
  className?: string;
};

export function SignOutButton({ variant = "button", className }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const base =
    variant === "link"
      ? "text-sm font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-300 dark:hover:text-white disabled:opacity-60"
      : "inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-base font-medium text-neutral-800 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-60 dark:text-neutral-100 dark:ring-neutral-600 dark:hover:bg-neutral-900";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await signOut();
          router.push("/login");
          router.refresh();
        });
      }}
      className={[base, className].filter(Boolean).join(" ")}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
