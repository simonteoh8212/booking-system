import { ImageResponse } from "next/og";

export function GET() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "SideBox";

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
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
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
              {appName}
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
