import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function CheckBookingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header Skeleton */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Book Appointment</span>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-7 h-7 rounded-lg" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <Skeleton className="w-12 h-12 rounded-full mx-auto" />
          <Skeleton className="h-7 w-56 mx-auto" />
          <Skeleton className="h-4 w-72 mx-auto" />
        </div>

        {/* Search bar skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-12 flex-1 rounded-md" />
          <Skeleton className="h-12 w-28 rounded-md" />
        </div>

        {/* Card skeleton */}
        <div className="p-5 rounded-xl border bg-card/60 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
