"use client";

import { AppQuickNav } from "@/components/app-quick-nav";
import { LogToastProvider } from "@/components/log-toast-provider";

export function AppAuthenticatedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LogToastProvider>
      <div className="app-shell">{children}</div>
      <AppQuickNav />
    </LogToastProvider>
  );
}
