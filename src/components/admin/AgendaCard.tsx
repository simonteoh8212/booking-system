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
import { Loader2, Trash2, Phone } from "lucide-react";

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
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <BookingStatusBadge
            status={booking.status}
            receiptSubmittedAt={booking.receiptSubmittedAt}
            isZh={isZh}
          />
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {booking.service.name}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {booking.customer.phoneNumber}
          </span>
          <span className="text-xs font-medium text-primary">
            {formatPrice(booking.totalPriceCents, currencySymbol)}
          </span>
          {booking.depositDueCents != null &&
          booking.depositDueCents > 0 &&
          booking.depositDueCents < booking.totalPriceCents && (
            <span className="text-[11px] text-muted-foreground">
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
              <SelectTrigger className="w-32 h-8 text-xs">
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
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setCancelOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                  <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {isZh ? "取消此预约？" : "Cancel Booking?"}
                    </DialogTitle>
                    <DialogDescription>
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
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={isPending}>
                      {isZh ? "保留预约" : "Keep Booking"}
                    </Button>
                    <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
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
