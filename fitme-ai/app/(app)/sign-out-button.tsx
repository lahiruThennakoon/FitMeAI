"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/lib/auth-client";
import { btnClass } from "@/lib/ui/buttons";

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
      : btnClass("secondary", { block: true });

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
