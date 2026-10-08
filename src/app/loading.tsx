import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";

export default function CustomerLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header Skeleton */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center animate-pulse">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </header>

      {/* Main Funnel Skeleton */}
      <main className="max-w-md mx-auto px-4 pb-16 pt-6 space-y-8">
        {/* Step Indicator Skeleton */}
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step, i) => (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 mx-auto">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-2 w-10 hidden sm:block" />
              </div>
              {i < 3 && <Skeleton className="flex-1 h-0.5 mx-2" />}
            </div>
          ))}
        </div>

        {/* Step Header */}
        <div className="text-center space-y-2">
          <Skeleton className="h-7 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>

        {/* Service Cards Skeletons */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl border bg-card/60 space-y-3 shadow-xs"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
