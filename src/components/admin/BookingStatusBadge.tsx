"use client";

import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/types";

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  PENDING: {
    label: "Pending",
    variant: "outline",
    className: "border-amber-500 text-amber-600 bg-amber-50",
  },
  CONFIRMED: {
    label: "Confirmed",
    variant: "outline",
    className: "border-blue-500 text-blue-600 bg-blue-50",
  },
  COMPLETED: {
    label: "Completed",
    variant: "outline",
    className: "border-green-600 text-green-700 bg-green-50",
  },
  CANCELLED: {
    label: "Cancelled",
    variant: "outline",
    className: "border-red-500 text-red-600 bg-red-50",
  },
  NO_SHOW: {
    label: "No Show",
    variant: "outline",
    className: "border-gray-400 text-gray-600 bg-gray-50",
  },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
