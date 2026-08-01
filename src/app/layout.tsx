import type { Metadata } from "next";
import { SessionProvider } from "@/components/providers/session-provider";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "역사자료부 자료이관 시스템",
  description: "교회 역사자료의 등록·검색·이관을 관리하는 내부 시스템",
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "역사자료부 자료이관 시스템",
    description: "교회 역사자료의 등록·검색·이관을 관리하는 내부 시스템",
    siteName: "역사자료부 자료이관 시스템",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
