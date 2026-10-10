"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { lookupBookingStatus } from "@/actions/booking";
import { getOperatingHoursInfo } from "@/lib/operating-hours";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { CustomerBookingLookupDto } from "@/types";
import {
  Search,
  Loader2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  XCircle,
  MessageCircle,
  ArrowLeft,
  Copy,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

function CheckBookingContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref") ?? "";

  const [query, setQuery] = useState(initialRef);
  const [honeypot, setHoneypot] = useState("");
  const [isCooldown, setIsCooldown] = useState(false);
  const [booking, setBooking] = useState<CustomerBookingLookupDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const operatingHours = getOperatingHoursInfo();
  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Our Salon";

  function performSearch(searchQuery: string) {
    if (!searchQuery.trim() || isCooldown) return;
    setErrorMessage(null);

    setIsCooldown(true);
    setTimeout(() => setIsCooldown(false), 1200);

    startTransition(async () => {
      const result = await lookupBookingStatus(searchQuery, honeypot);
      if (result.success) {
        setBooking(result.data);
      } else {
        setBooking(null);
        setErrorMessage(result.error);
      }
    });
  }

  // Auto-search if ref was passed in URL query param
  useEffect(() => {
    if (initialRef) {
      performSearch(initialRef);
    }
  }, [initialRef]);

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    performSearch(query);
  }

  function copyRef(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Book Appointment
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <CalendarDays className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xs">{businessName}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-1">
            <Search className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Check Booking Status</h1>
          <p className="text-sm text-muted-foreground">
            Enter your booking reference code (e.g. {process.env.NEXT_PUBLIC_BOOKING_REF_PREFIX || "BK"}-XXXXX) or registered phone number.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleFormSubmit} className="space-y-2">
          {/* Invisible honeypot field (bot trap) */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="company_site_url"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`e.g. ${process.env.NEXT_PUBLIC_BOOKING_REF_PREFIX || "BK"}-8F29A or 0123456789`}
              className="h-12 uppercase font-medium tracking-wide"
              autoFocus
              maxLength={35}
            />
            <Button
              type="submit"
              disabled={isPending || isCooldown || !query.trim()}
              className="h-12 px-5 gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </div>
        </form>

        {/* Error message */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
            {errorMessage}
          </div>
        )}

        {/* Booking Result Card */}
        {booking && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Status Header Banner */}
            {booking.status === "CONFIRMED" && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800 space-y-2">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="font-bold text-sm">Booking Confirmed!</span>
                </div>
                <p className="text-xs text-green-800 dark:text-green-200 leading-relaxed">
                  Your appointment has been officially confirmed by our team. We look forward to welcoming you!
                </p>
              </div>
            )}

            {booking.status === "PENDING" && booking.receiptSubmittedAt && (
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  <span className="font-bold text-sm">Slot Locked — Awaiting Verification</span>
                </div>
                <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
                  We have received your payment receipt! <strong>Your slot is securely locked</strong> and cannot be taken by anyone else. Our staff will verify your receipt and confirm your booking during operating hours ({operatingHours.displayDays}, {operatingHours.displayHours}).
                </p>
              </div>
            )}

            {booking.status === "PENDING" && !booking.receiptSubmittedAt && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <Clock className="h-5 w-5 shrink-0" />
                  <span className="font-bold text-sm">Temporary Hold (Awaiting Receipt)</span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                  This booking is awaiting payment receipt submission. Unsubmitted holds expire after 7 minutes.
                </p>
              </div>
            )}

            {booking.status === "CANCELLED" && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 shrink-0" />
                  <span className="font-bold text-sm">Booking Cancelled or Expired</span>
                </div>
                <p className="text-xs opacity-90 leading-relaxed">
                  This booking was cancelled or the temporary hold expired before payment was confirmed.
                </p>
              </div>
            )}

            {booking.status === "COMPLETED" && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 space-y-2">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="font-bold text-sm">Appointment Completed</span>
                </div>
                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                  This service appointment has been completed. Thank you for choosing us!
                </p>
              </div>
            )}

            {/* Reference code pill */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 border">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Reference Code
                </p>
                <p className="font-mono text-lg font-bold">{booking.referenceCode}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    booking.status === "CONFIRMED"
                      ? "default"
                      : booking.status === "CANCELLED"
                      ? "destructive"
                      : "secondary"
                  }
                  className="capitalize font-semibold"
                >
                  {booking.status.toLowerCase()}
                </Badge>
                <button
                  type="button"
                  onClick={() => copyRef(booking.referenceCode)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy reference code"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            {copied && <p className="text-xs text-green-600 text-right -mt-2">Copied to clipboard!</p>}

            {/* Booking Details Card */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Appointment Details</h3>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium">{booking.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-mono text-xs">{booking.maskedPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium text-right">{booking.serviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium text-right">
                      {format(new Date(booking.startDatetime), "EEEE, d MMMM yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium text-right">
                      {format(new Date(booking.startDatetime), "h:mm a")}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total Service Fee</span>
                    <span className="text-primary">{formatPrice(booking.totalPriceCents)}</span>
                  </div>

                  {booking.depositDueCents != null &&
                  booking.depositDueCents > 0 &&
                  booking.depositDueCents < booking.totalPriceCents && (
                    <>
                      <div className="flex justify-between text-xs text-muted-foreground pt-0.5">
                        <span>Deposit Paid</span>
                        <span className="font-semibold text-green-600">
                          {formatPrice(booking.depositDueCents)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Balance Payable at Salon</span>
                        <span className="font-semibold text-foreground">
                          {formatPrice(
                            booking.balanceDueCents ??
                              booking.totalPriceCents - booking.depositDueCents
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Contact CTA */}
            <a
              href={booking.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button
                variant="outline"
                className="w-full h-12 text-sm border-green-600/30 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 gap-2"
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                Chat with Us on WhatsApp
              </Button>
            </a>
          </div>
        )}

        {/* Operating hours footer reminder */}
        <div className="p-4 rounded-xl bg-muted/40 border text-center space-y-1 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Shop Operating Hours</p>
          <p>
            {operatingHours.displayDays}: {operatingHours.displayHours}
          </p>
          <p className="text-[11px] opacity-80">
            Payment receipt verifications are processed during active business hours.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function CheckBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckBookingContent />
    </Suspense>
  );
}
