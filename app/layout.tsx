import type React from "react";
import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { ServiceWorkerRegistration } from "@/components/shared/service-worker-registration";

const sarabun = Sarabun({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className={`${sarabun.variable} font-sans`}
        suppressHydrationWarning
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-3 focus:py-2 focus:rounded"
        >
          ข้ามไปยังเนื้อหา
        </a>
        <ServiceWorkerRegistration />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
