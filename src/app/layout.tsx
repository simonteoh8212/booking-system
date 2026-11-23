import { Manrope, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";
import { ToastProvider } from "@/components/ToastProvider";
import { PwaSplashDismiss } from "@/components/PwaSplashDismiss";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
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

const appName = process.env.NEXT_PUBLIC_APP_NAME || "SideBox";

function sanitizeCssColor(raw?: string): string | null {
  const val = raw?.trim();
  if (!val) return null;
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) return val;
  if (/^oklch\(\s*[0-9.]+%?\s+[0-9.]+\s+[0-9.]+\s*\)$/i.test(val)) return val;
  return null;
}

function getContrastForeground(hexColor: string): string {
  if (!hexColor.startsWith("#")) return "#ffffff";
  const hex =
    hexColor.length === 4
      ? hexColor
          .slice(1)
          .split("")
          .map((c) => c + c)
          .join("")
      : hexColor.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? "#0f172a" : "#ffffff";
}

const customPrimary = sanitizeCssColor(process.env.NEXT_PUBLIC_PRIMARY_COLOR);
const customPrimaryFg = customPrimary
  ? getContrastForeground(customPrimary)
  : null;

export const metadata: Metadata = {
  title: appName,
  description: `${appName} point-of-sale & management web app`,
  applicationName: appName,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: appName,
    startupImage: [
      // iPhone 14 Pro, 15, 15 Pro, 16, 16 Pro
      {
        url: "/apple-splash.png",
        media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus, 16 Pro Max
      {
        url: "/apple-splash.png",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 12, 12 Pro, 13, 13 Pro, 14
      {
        url: "/apple-splash.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 12 Pro Max, 13 Pro Max, 14 Plus
      {
        url: "/apple-splash.png",
        media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 11 Pro, XS, X
      {
        url: "/apple-splash.png",
        media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 11, XR
      {
        url: "/apple-splash.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
      },
      // iPhone 7, 8, SE 2/3
      {
        url: "/apple-splash.png",
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
      // Generic fallback
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
              ${
                customPrimary
                  ? `:root {
                --primary: ${customPrimary};
                --primary-foreground: ${customPrimaryFg};
                --ring: ${customPrimary};
                --accent: color-mix(in srgb, ${customPrimary} 10%, #ffffff);
                --accent-foreground: color-mix(in srgb, ${customPrimary} 85%, #000000);
                --sidebar-primary: ${customPrimary};
                --sidebar-primary-foreground: ${customPrimaryFg};
                --sidebar-accent: color-mix(in srgb, ${customPrimary} 10%, #ffffff);
                --sidebar-accent-foreground: color-mix(in srgb, ${customPrimary} 85%, #000000);
                --sidebar-ring: ${customPrimary};
                --chart-1: ${customPrimary};
              }`
                  : ""
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
              alt={appName}
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
              {appName}
            </span>
            <div
              style={{
                marginTop: "16px",
                width: "22px",
                height: "22px",
                border: "2.5px solid #e2e8f0",
                borderTopColor: customPrimary || "#0284c7",
                borderRadius: "50%",
                animation: "pwa-spin 0.75s linear infinite",
              }}
            />
          </div>
        </div>

        <PwaSplashDismiss />
        <ServiceWorkerRegister />
        <NavigationProgressBar />
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
