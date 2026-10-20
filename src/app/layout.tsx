import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Book an Appointment",
    template: "%s | BookEase",
  },
  description: "Easy online appointment booking for local service businesses.",
};

import { NavigationProgressBar } from "@/components/NavigationProgressBar";

export const instant = false;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${plusJakartaSans.className} antialiased min-h-screen bg-background font-sans`}
      >
        <NavigationProgressBar />
        {children}
      </body>
    </html>
  );
}
