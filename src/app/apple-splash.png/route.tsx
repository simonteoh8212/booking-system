import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
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
          {/* Logo container */}
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: 42,
              backgroundColor: "#f8fafc",
              border: "2px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)",
            }}
          >
            <svg
              width="100"
              height="100"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0284c7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" />
              <line x1="14.47" y1="14.48" x2="20" y2="20" />
              <line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 36,
            }}
          >
            <span
              style={{
                fontSize: 44,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.03em",
              }}
            >
              Salon POS
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#0284c7",
                marginTop: 10,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Point of Sale & Management
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1170,
      height: 2532,
    }
  );
}
