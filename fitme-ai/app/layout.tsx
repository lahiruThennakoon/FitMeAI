import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { OfflineReconciler } from "@/components/offline-reconciler";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ThemeInit } from "@/components/theme-init";
import { ThemeProvider } from "@/components/theme-provider";
import { getSession } from "@/lib/dal";
import { getProfileForUser } from "@/lib/dal/profile";
import { normalizeAppearancePreference } from "@/lib/domain/appearance/types";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FitMe AI",
  description:
    "Accuracy-first calorie & nutrition tracker with Sri Lankan food support.",
  manifest: "/manifest.webmanifest",
  applicationName: "FitMe AI",
  appleWebApp: { capable: true, title: "FitMe AI", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2f57e3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSession();
  const profile = user ? await getProfileForUser(user.id) : null;
  const serverAppearance = profile
    ? normalizeAppearancePreference(profile.appearancePreference)
    : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeInit fallbackAppearance={serverAppearance} />
        <ThemeProvider serverAppearance={serverAppearance}>
          <ServiceWorkerRegister />
          <OfflineReconciler />
          <PwaInstallPrompt />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
