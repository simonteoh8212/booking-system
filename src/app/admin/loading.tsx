import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title */}
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-56 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-16 rounded-md" />
        </div>
        <Skeleton className="h-9 w-44 rounded-xl" />
      </div>

      {/* Calendar Card Skeleton */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        {/* Month Header */}
        <div className="p-4 sm:p-5 border-b flex justify-between items-center">
          <Skeleton className="h-6 w-36" />
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b bg-muted/40 py-2.5 px-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-4 w-12 mx-auto" />
          ))}
        </div>

        {/* Calendar Grid (5 weeks x 7 days) */}
        <div className="grid grid-cols-7 divide-x divide-y border-b">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[75px] sm:min-h-[96px] p-2 flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <Skeleton className="h-3.5 w-4 rounded" />
                {i % 4 === 0 && <Skeleton className="w-5 h-5 rounded-full" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Appointments List Skeleton below */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 rounded-xl border bg-card flex gap-4">
              <Skeleton className="h-10 w-16" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
