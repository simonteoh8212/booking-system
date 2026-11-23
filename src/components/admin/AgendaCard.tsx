"use client";

import { useState, useTransition } from "react";
import { updateBookingStatus, cancelBooking } from "@/actions/admin-bookings";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import type { BookingDto, BookingStatus } from "@/types";
import { Loader2, Trash2, MessageCircle } from "lucide-react";

const STATUS_OPTIONS: { id: BookingStatus; en: string; zh: string }[] = [
  { id: "PENDING", en: "Pending", zh: "待处理" },
  { id: "CONFIRMED", en: "Confirmed", zh: "已确认" },
  { id: "COMPLETED", en: "Completed", zh: "已完成" },
  { id: "NO_SHOW", en: "No Show", zh: "爽约" },
];

interface AgendaCardProps {
  booking: BookingDto;
  onUpdate: (updated: BookingDto) => void;
  currencySymbol?: string;
  isZh?: boolean;
}

export function AgendaCard({
  booking,
  onUpdate,
  currencySymbol,
  isZh = false,
}: AgendaCardProps) {
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);

  const currentStatusOption = STATUS_OPTIONS.find((s) => s.id === booking.status);
  const currentStatusLabel = currentStatusOption
    ? isZh
      ? currentStatusOption.zh
      : currentStatusOption.en
    : booking.status === "CANCELLED"
    ? isZh
      ? "已取消"
      : "Cancelled"
    : booking.status;

  function handleStatusChange(status: BookingStatus | null) {
    if (!status) return;
    startTransition(async () => {
      const result = await updateBookingStatus(booking.id, status);
      if (result.success) onUpdate(result.data);
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelBooking(booking.id);
      if (result.success) {
        onUpdate(result.data);
        setCancelOpen(false);
      }
    });
  }

  const isCancellable =
    booking.status === "PENDING" || booking.status === "CONFIRMED";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow">
      {/* Time column */}
      <div className="sm:w-20 shrink-0">
        <p className="text-sm font-bold">
          {format(new Date(booking.startDatetime), isZh ? "HH:mm" : "h:mm a")}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(booking.endDatetime), isZh ? "HH:mm" : "h:mm a")}
        </p>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-foreground truncate">
            {booking.customer.name}
          </span>
          <BookingStatusBadge
            status={booking.status}
            receiptSubmittedAt={booking.receiptSubmittedAt}
            isZh={isZh}
          />
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {booking.service.name}
        </p>
        <div className="flex items-center gap-3 flex-wrap pt-0.5">
          {booking.customer.phoneNumber.startsWith("WALKIN-") ? (
            <span className="text-xs text-muted-foreground">
              {isZh ? "散客" : "Walk-in"}
            </span>
          ) : (
            <a
              href={(() => {
                let digits = booking.customer.phoneNumber.replace(/\D/g, "");
                if (digits.startsWith("0")) {
                  digits = "60" + digits.slice(1);
                } else if (
                  digits.startsWith("1") &&
                  digits.length >= 9 &&
                  digits.length <= 10
                ) {
                  digits = "60" + digits;
                }
                return `https://wa.me/${digits}`;
              })()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-mono font-medium"
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{booking.customer.phoneNumber}</span>
            </a>
          )}
          <span className="text-xs font-semibold text-primary tabular-nums">
            {formatPrice(booking.totalPriceCents, currencySymbol)}
          </span>
          {booking.depositDueCents != null &&
          booking.depositDueCents > 0 &&
          booking.depositDueCents < booking.totalPriceCents && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              ({isZh ? "定金" : "Dep"}:{" "}
              <span className="text-green-600 font-semibold">
                {formatPrice(booking.depositDueCents, currencySymbol)}
              </span>{" "}
              · {isZh ? "尾款" : "Bal"}:{" "}
              {formatPrice(
                booking.balanceDueCents ??
                  booking.totalPriceCents - booking.depositDueCents,
                currencySymbol
              )}
              )
            </span>
          )}
          <span className="text-xs text-muted-foreground font-mono">
            {booking.referenceCode}
          </span>
        </div>
        {booking.notes && (
          <p className="text-xs text-muted-foreground mt-1 italic truncate">
            {isZh ? "备注" : "Note"}: {booking.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Select
              value={booking.status}
              onValueChange={handleStatusChange}
              disabled={
                booking.status === "CANCELLED" || booking.status === "COMPLETED"
              }
            >
              <SelectTrigger className="w-32 h-10 sm:h-8 text-xs">
                <SelectValue>{currentStatusLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {isZh ? s.zh : s.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isCancellable && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-8 sm:w-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                  onClick={() => setCancelOpen(true)}
                  aria-label={isZh ? "取消预约" : "Cancel booking"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                  <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {isZh ? "取消此预约？" : "Cancel Booking?"}
                      </DialogTitle>
                      <DialogDescription className="text-xs leading-relaxed">
                        {isZh ? (
                          <>
                            即将取消客户 <strong>{booking.customer.name}</strong> 的预约单{" "}
                            <strong>{booking.referenceCode}</strong>，并立即释放该时段。此操作无法撤销。
                          </>
                        ) : (
                          <>
                            This will cancel booking <strong>{booking.referenceCode}</strong> for{" "}
                            <strong>{booking.customer.name}</strong> and immediately free up the slot.
                            This action cannot be undone.
                          </>
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2.5">
                      <Button
                        variant="outline"
                        onClick={() => setCancelOpen(false)}
                        disabled={isPending}
                        className="h-10 sm:h-9 w-full sm:w-auto cursor-pointer"
                      >
                        {isZh ? "保留预约" : "Keep Booking"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={isPending}
                        className="h-10 sm:h-9 w-full sm:w-auto cursor-pointer"
                      >
                        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {isZh ? "确认取消" : "Cancel Booking"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
