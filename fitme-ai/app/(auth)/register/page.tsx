import Image from "next/image";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
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
          Create your account
        </h1>
        <p className="text-balance text-sm text-neutral-600 dark:text-neutral-400">
          A private space for your food log and targets. We&apos;ll send a
          verification link to confirm your email.
        </p>
      </header>

      <RegisterForm />

      <p className="text-center text-xs text-neutral-500">
        FitMe AI helps you track, not diagnose. Consult a professional for
        medical concerns.
      </p>
    </main>
  );
}
