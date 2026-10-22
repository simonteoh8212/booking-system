import { ImageResponse } from "next/og";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const width = Math.min(Math.max(parseInt(searchParams.get("w") || "1206", 10), 300), 3000);
  const height = Math.min(Math.max(parseInt(searchParams.get("h") || "2622", 10), 500), 3500);
  const isDark = searchParams.get("mode") === "dark";

  const bg = isDark ? "#0b1120" : "#ffffff";
  const titleColor = isDark ? "#f8fafc" : "#0f172a";
  const subtitleColor = isDark ? "#38bdf8" : "#0284c7";
  const boxBg = isDark ? "#1e293b" : "#f8fafc";
  const boxBorder = isDark ? "#334155" : "#e2e8f0";
  const iconStroke = isDark ? "#38bdf8" : "#0284c7";

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
          backgroundColor: bg,
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
              borderRadius: 44,
              backgroundColor: boxBg,
              border: `2px solid ${boxBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isDark
                ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                : "0 25px 50px -12px rgba(0, 0, 0, 0.1)",
            }}
          >
            <svg
              width="100"
              height="100"
              viewBox="0 0 24 24"
              fill="none"
              stroke={iconStroke}
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
              marginTop: 40,
            }}
          >
            <span
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: titleColor,
                letterSpacing: "-0.03em",
              }}
            >
              Salon POS
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: subtitleColor,
                marginTop: 12,
                letterSpacing: "0.06em",
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
      width,
      height,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
}
