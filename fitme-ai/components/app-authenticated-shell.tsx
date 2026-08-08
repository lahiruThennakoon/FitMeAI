"use client";

import { AppQuickNav } from "@/components/app-quick-nav";
import { LogToastProvider } from "@/components/log-toast-provider";

export function AppAuthenticatedShell({
  children,
  highlightLogNav = false,
}: {
  children: React.ReactNode;
  highlightLogNav?: boolean;
}) {
  return (
    <LogToastProvider>
      <div className="app-shell">{children}</div>
      <AppQuickNav highlightLogNav={highlightLogNav} />
    </LogToastProvider>
  );
}
