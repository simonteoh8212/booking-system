"use client";

import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/types";

const STATUS_CONFIG: Record<
  BookingStatus,
  {
    en: string;
    zh: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  PENDING: {
    en: "Pending",
    zh: "待处理",
    variant: "outline",
    className: "border-amber-500 text-amber-600 bg-amber-50",
  },
  CONFIRMED: {
    en: "Confirmed",
    zh: "已确认",
    variant: "outline",
    className: "border-blue-500 text-blue-600 bg-blue-50",
  },
  COMPLETED: {
    en: "Completed",
    zh: "已完成",
    variant: "outline",
    className: "border-green-600 text-green-700 bg-green-50",
  },
  CANCELLED: {
    en: "Cancelled",
    zh: "已取消",
    variant: "outline",
    className: "border-red-500 text-red-600 bg-red-50",
  },
  NO_SHOW: {
    en: "No Show",
    zh: "爽约",
    variant: "outline",
    className: "border-gray-400 text-gray-600 bg-gray-50",
  },
};

export function BookingStatusBadge({
  status,
  receiptSubmittedAt,
  isZh = false,
}: {
  status: BookingStatus;
  receiptSubmittedAt?: string | null;
  isZh?: boolean;
}) {
  if (status === "PENDING") {
    if (receiptSubmittedAt) {
      return (
        <Badge
          variant="outline"
          className="border-indigo-500 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800"
        >
          {isZh ? "已传凭证" : "Receipt Sent"}
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"
      >
        {isZh ? "待付定金" : "Holding (Unpaid)"}
      </Badge>
    );
  }

  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className={config.className}>
      {isZh ? config.zh : config.en}
    </Badge>
  );
}
