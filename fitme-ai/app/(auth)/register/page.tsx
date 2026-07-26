import { AuthPageShell } from "@/components/auth-page-shell";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <AuthPageShell
      title="Create your account"
      description="A private space for your food log and targets. We’ll send a verification link to confirm your email."
    >
      <RegisterForm />
    </AuthPageShell>
  );
}
