import { Manrope, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";
import { ToastProvider } from "@/components/ToastProvider";
import { PwaSplashDismiss } from "@/components/PwaSplashDismiss";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
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
      // iPhone 16 Pro, iPhone 17 Pro (6.3" Display - 402x874 pt @3x)
      {
        url: "/api/pwa-splash?w=1206&h=2622&mode=dark",
        media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)",
      },
      {
        url: "/api/pwa-splash?w=1206&h=2622&mode=light",
        media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)",
      },
      {
        url: "/api/pwa-splash?w=1206&h=2622",
        media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 16 Pro Max, iPhone 17 Pro Max (6.9" Display - 440x956 pt @3x)
      {
        url: "/api/pwa-splash?w=1320&h=2868&mode=dark",
        media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)",
      },
      {
        url: "/api/pwa-splash?w=1320&h=2868&mode=light",
        media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)",
      },
      {
        url: "/api/pwa-splash?w=1320&h=2868",
        media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus (430x932 pt @3x)
      {
        url: "/api/pwa-splash?w=1290&h=2796&mode=dark",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)",
      },
      {
        url: "/api/pwa-splash?w=1290&h=2796&mode=light",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)",
      },
      {
        url: "/api/pwa-splash?w=1290&h=2796",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 14 Pro, 15, 15 Pro, 16 (393x852 pt @3x)
      {
        url: "/api/pwa-splash?w=1179&h=2556&mode=dark",
        media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)",
      },
      {
        url: "/api/pwa-splash?w=1179&h=2556&mode=light",
        media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)",
      },
      {
        url: "/api/pwa-splash?w=1179&h=2556",
        media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 12 Pro Max, 13 Pro Max, 14 Plus (428x926 pt @3x)
      {
        url: "/api/pwa-splash?w=1284&h=2778",
        media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 12, 12 Pro, 13, 13 Pro, 14 (390x844 pt @3x)
      {
        url: "/api/pwa-splash?w=1170&h=2532",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 11 Pro, XS, X (375x812 pt @3x)
      {
        url: "/api/pwa-splash?w=1125&h=2436",
        media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 11, XR (414x896 pt @2x)
      {
        url: "/api/pwa-splash?w=828&h=1792",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
      },
      // iPhone 7, 8, SE 2/3 (375x667 pt @2x)
      {
        url: "/api/pwa-splash?w=750&h=1334",
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
      // Generic fallback
      {
        url: "/api/pwa-splash?w=1206&h=2622",
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
                background-color: #ffffff;
              }
              @media (prefers-color-scheme: dark) {
                html, body {
                  background-color: #0b1120 !important;
                }
                #pwa-splash {
                  background-color: #0b1120 !important;
                }
                #pwa-splash-text {
                  color: #f8fafc !important;
                }
                #pwa-splash-spinner {
                  border-color: #334155 !important;
                  border-top-color: #38bdf8 !important;
                }
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
              id="pwa-splash-text"
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
              id="pwa-splash-spinner"
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
