import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-10 sm:max-w-lg">
      <header className="space-y-3 text-center">
        <Link href="/" className="inline-block">
          <Image
            src="/brand/logo.png"
            alt="FitMe AI"
            width={516}
            height={156}
            priority
            className="mx-auto h-auto w-48 sm:w-56"
          />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          Choose a new password
        </h1>
        <p className="text-balance text-sm text-neutral-600 dark:text-neutral-400">
          Pick something secure you haven&apos;t used here before.
        </p>
      </header>

      <Suspense fallback={<p className="text-center text-sm">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
