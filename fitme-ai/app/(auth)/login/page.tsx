import { AuthPageShell } from "@/components/auth-page-shell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Sign in"
      description="Welcome back — pick up your food log and today’s energy."
    >
      <LoginForm />
    </AuthPageShell>
  );
}
