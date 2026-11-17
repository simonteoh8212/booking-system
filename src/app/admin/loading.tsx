import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Unified KPI Strip Skeleton */}
      <div className="rounded-xl border border-border bg-card grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {[1, 2, 3].map((card) => (
          <div key={card} className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-8 w-36 rounded-lg" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Agenda Skeleton */}
      <div className="space-y-3 pt-2">
        <Skeleton className="h-5 w-24" />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 py-2.5 px-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-4 w-10 mx-auto" />
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-border">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className="min-h-[72px] p-2">
                <Skeleton className="h-3.5 w-4 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
