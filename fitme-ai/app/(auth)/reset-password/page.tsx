import { Suspense } from "react";
import { AuthPageShell } from "@/components/auth-page-shell";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthPageShell
      title="Choose a new password"
      description="Pick something secure you haven’t used here before."
      disclaimer={null}
    >
      <Suspense
        fallback={
          <p className="text-center text-sm text-neutral-500">Loading…</p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthPageShell>
  );
}
