"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
      className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-medium text-neutral-700 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-60 dark:text-neutral-200 dark:ring-neutral-700 dark:hover:bg-neutral-900"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
