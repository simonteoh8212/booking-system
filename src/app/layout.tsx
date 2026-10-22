import { Manrope, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";
import { ToastProvider } from "@/components/ToastProvider";
import { PwaSplashDismiss } from "@/components/PwaSplashDismiss";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#70adf5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

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
  title: "Salon POS",
  description: "Salon point-of-sale web app",
  applicationName: "Salon POS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Salon POS",
    startupImage: [
      {
        url: "/apple-splash.png",
      },
    ],
  },
  icons: {
    icon: "/icon.png",
    apple: [
      { url: "/apple-icon.png" },
      { url: "/apple-touch-icon.png" },
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
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #ffffff !important;
              }
              @keyframes pwa-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `,
          }}
        />
      </head>
      <body
        className={`${manrope.className} antialiased min-h-screen bg-background font-sans`}
      >
        {/* Instant Pre-Hydration PWA Splash Screen for iOS & Mobile Web */}
        <div
          id="pwa-splash"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "#ffffff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transition: "opacity 0.35s ease, visibility 0.35s ease",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/apple-touch-icon.png"
              alt="Salon POS"
              width={76}
              height={76}
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "18px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                objectFit: "cover",
              }}
            />
            <span
              style={{
                marginTop: "16px",
                fontWeight: 800,
                fontSize: "19px",
                color: "#0f172a",
                letterSpacing: "-0.02em",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              Salon POS
            </span>
            <div
              style={{
                marginTop: "16px",
                width: "22px",
                height: "22px",
                border: "2.5px solid #e2e8f0",
                borderTopColor: "#0284c7",
                borderRadius: "50%",
                animation: "pwa-spin 0.75s linear infinite",
              }}
            />
          </div>
        </div>

        <PwaSplashDismiss />
        <NavigationProgressBar />
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
