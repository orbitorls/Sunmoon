import { Suspense } from "react";
import type React from "react";
import type { Metadata } from "next";
import { Inter, Manrope, Prompt } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/shared/service-worker-registration";
import { AppShell } from "@/components/shared/app-shell";

const inter = Inter({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-manrope",
});

const prompt = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "SEAPALO - พยากรณ์น้ำขึ้นน้ำลง",
  description:
    "พยากรณ์น้ำขึ้นน้ำลงและสภาพอากาศแบบเรียลไทม์สำหรับพื้นที่ชายฝั่งไทย",
  generator: "v0.dev",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SEAPALO",
  },
  formatDetection: {
    telephone: false,
  },
};

// Per Next.js app router guidance: export `viewport` separately instead of placing it inside `metadata`.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "light",
  themeColor: "#F8FAFC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${inter.variable} ${manrope.variable} ${prompt.variable} font-sans`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-3 focus:py-2 focus:rounded"
        >
          ข้ามไปยังเนื้อหา
        </a>
        <ServiceWorkerRegistration />
        <Suspense>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
