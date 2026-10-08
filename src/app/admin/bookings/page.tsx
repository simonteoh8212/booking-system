import type { Metadata } from "next";
import { getAllBookings } from "@/actions/admin-bookings";
import { BookingStatusBadge } from "@/components/admin/BookingStatusBadge";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { connection } from "next/server";

export const metadata: Metadata = { title: "All Bookings" };

export default async function BookingsPage() {
  await connection();
  const result = await getAllBookings();
  const bookings = result.success ? result.data.bookings : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Bookings</h1>
        <p className="text-muted-foreground text-sm">
          {result.success ? `${result.data.total} total bookings` : ""}
        </p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No bookings found.
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs font-bold">
                    {b.referenceCode}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{b.customer.name}</p>
                    <p className="text-xs text-muted-foreground">{b.customer.phoneNumber}</p>
                  </TableCell>
                  <TableCell>{b.service.name}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(b.startDatetime), "d MMM yyyy, h:mm a")}
                  </TableCell>
                  <TableCell>{formatPrice(b.totalPriceCents)}</TableCell>
                  <TableCell>
                    <BookingStatusBadge
                      status={b.status}
                      receiptSubmittedAt={b.receiptSubmittedAt}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
