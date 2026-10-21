"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={10}
      containerStyle={{
        top: 24,
      }}
      toastOptions={{
        duration: 3500,
        style: {
          background: "var(--card, #ffffff)",
          color: "var(--foreground, #111827)",
          border: "1px solid var(--border, #e5e7eb)",
          borderRadius: "1rem",
          boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          padding: "12px 18px",
          fontSize: "14px",
          fontWeight: 600,
        },
        success: {
          iconTheme: {
            primary: "#10b981",
            secondary: "#ffffff",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#ffffff",
          },
        },
      }}
    />
  );
}
