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

const STATUS_OPTIONS: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
];

interface AgendaCardProps {
  booking: BookingDto;
  onUpdate: (updated: BookingDto) => void;
}

export function AgendaCard({ booking, onUpdate }: AgendaCardProps) {
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);

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
          {format(new Date(booking.startDatetime), "h:mm a")}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(booking.endDatetime), "h:mm a")}
        </p>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold truncate">{booking.customer.name}</p>
          <BookingStatusBadge status={booking.status} />
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
            {formatPrice(booking.totalPriceCents)}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {booking.referenceCode}
          </span>
        </div>
        {booking.notes && (
          <p className="text-xs text-muted-foreground mt-1 italic truncate">
            Note: {booking.notes}
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
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")}
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
                    <DialogTitle>Cancel Booking?</DialogTitle>
                    <DialogDescription>
                      This will cancel booking <strong>{booking.referenceCode}</strong> for{" "}
                      <strong>{booking.customer.name}</strong> and immediately free up the slot.
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={isPending}>
                      Keep Booking
                    </Button>
                    <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
                      {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Cancel Booking
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
