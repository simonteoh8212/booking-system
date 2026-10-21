import type { Metadata } from "next";
import { Manrope, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";
import { ToastProvider } from "@/components/ToastProvider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Book an Appointment",
    template: "%s | BookEase",
  },
  description: "Easy online appointment booking for local service businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${notoSansSC.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${manrope.className} antialiased min-h-screen bg-background font-sans`}
      >
        <NavigationProgressBar />
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
