import { AuthPageShell } from "@/components/auth-page-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      title="Reset your password"
      description="Enter your email and we’ll send a secure link to choose a new password."
      disclaimer={null}
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
