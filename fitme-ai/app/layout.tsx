import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

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
    icon: "/brand/app-icon.png",
    apple: "/brand/app-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2f57e3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
