import Image from "next/image";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
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
          Reset your password
        </h1>
        <p className="text-balance text-sm text-neutral-600 dark:text-neutral-400">
          Enter your email and we&apos;ll send a secure link to choose a new
          password.
        </p>
      </header>

      <ForgotPasswordForm />
    </main>
  );
}
