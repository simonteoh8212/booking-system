import { Manrope, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";
import { ToastProvider } from "@/components/ToastProvider";
import type { Metadata, Viewport } from 'next'


export const viewport: Viewport = {
  themeColor: '#70adf5',
}
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
  title: 'Salon POS',
  description: 'Salon point-of-sale web app',
  applicationName: 'Salon POS',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Salon POS',
  },
  icons: {
    icon: '/icon.png',
    apple: [
      { url: '/apple-icon.png' },
      { url: '/apple-touch-icon.png' },
    ],
  },
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
