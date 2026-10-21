import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Salon Desk",
};

export default function DeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
